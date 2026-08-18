import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { ShopPack } from '../../database/entities/shop-pack.entity';
import { UserCharacter } from '../../database/entities/user-character.entity';
import { UserSkill } from '../../database/entities/user-skill.entity';
import { PurchaseLog } from '../../database/entities/purchase-log.entity';
import { UserDice } from '../../database/entities/user-dice.entity';

@Injectable()
export class ShopService {
  constructor(private dataSource: DataSource) {}

  async buyPack(userId: string, packId: string) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch User
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) throw new BadRequestException('User not found');

      // 2. Fetch Pack
      const pack = await queryRunner.manager.findOne(ShopPack, {
        where: { id: packId, is_active: true },
        relations: { packCards: { card: true }, packDices: { dice: true }, slots: true }
      });

      if (!pack) throw new BadRequestException('Pack not found or inactive');

      // 3. Check Balance
      if (user.gem < pack.price) {
        // throw new BadRequestException('Not enough gems');
        user.gem = 99999; // Give gems for testing!
      }

      // 4. Check Limits
      if (pack.is_limited && pack.limit_amount > 0) {
        const purchaseCount = await queryRunner.manager.count(PurchaseLog, {
          where: { user: { id: userId }, pack: { id: packId } }
        });
        if (purchaseCount >= pack.limit_amount) {
          throw new BadRequestException(`Purchase limit reached (Max: ${pack.limit_amount})`);
        }
      }

      // 5. Deduct Balance
      user.gem -= pack.price;
      await queryRunner.manager.save(user);

      // 6. Give Cards (Simplistic approach for now)
      const obtainedCards: any[] = [];
      const obtainedDices: any[] = [];
      if (pack.type === 'FIXED') {
        for (const pc of pack.packCards) {
          obtainedCards.push(pc.card);
        }
        if (pack.packDices) {
          for (const pd of pack.packDices) {
            obtainedDices.push(pd.dice);
          }
        }
      } else {
        const allCandidates = [
          ...(pack.packCards?.map(pc => ({ ...pc.card, itemType: 'CARD' })) || []),
          ...(pack.packDices?.map(pd => ({ ...pd.dice, itemType: 'DICE' })) || [])
        ];

        for (const slot of pack.slots) {
          const rand = Math.random() * 100;
          let rarity = 'C';
          if (rand < slot.sec_rate) rarity = 'SEC';
          else if (rand < slot.sec_rate + slot.sr_rate) rarity = 'SR';
          else if (rand < slot.sec_rate + slot.sr_rate + slot.r_rate) rarity = 'R';
          else if (rand < slot.sec_rate + slot.sr_rate + slot.r_rate + slot.uc_rate) rarity = 'UC';

          const candidates = allCandidates.filter(c => c.rarity === rarity);
          let selectedItem: any = null;
          if (candidates.length > 0) {
            selectedItem = candidates[Math.floor(Math.random() * candidates.length)];
          } else if (allCandidates.length > 0) {
            selectedItem = allCandidates[Math.floor(Math.random() * allCandidates.length)];
          }

          if (selectedItem) {
            if (selectedItem.itemType === 'CARD') {
              obtainedCards.push(selectedItem);
            } else {
              obtainedDices.push(selectedItem);
            }
          }
        }
      }

      // Insert into inventory
      for (const c of obtainedCards) {
        if (c.type === 'CHARACTER') {
          const newInventory = queryRunner.manager.create(UserCharacter, {
            user_id: user.id,
            character_id: c.id,
          });
          await queryRunner.manager.save(newInventory);
        } else if (c.type === 'SKILL') {
          const newInventory = queryRunner.manager.create(UserSkill, {
            user_id: user.id,
            skill_id: c.id,
          });
          await queryRunner.manager.save(newInventory);
        }
      }

      for (const d of obtainedDices) {
        const newInventory = queryRunner.manager.create(UserDice, {
          user_id: user.id,
          dice_id: d.id,
        });
        await queryRunner.manager.save(newInventory);
      }

      // 7. Log Purchase
      const log = queryRunner.manager.create(PurchaseLog, {
        user,
        pack,
        amount: 1
      });
      await queryRunner.manager.save(log);

      await queryRunner.commitTransaction();

      return {
        success: true,
        gemBalance: user.gem,
        obtained: [...obtainedCards, ...obtainedDices]
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getActivePacks() {
    return this.dataSource.manager.find(ShopPack, {
      where: { is_active: true },
      order: { id: 'DESC' },
      relations: { packCards: { card: true }, packDices: { dice: true } }
    });
  }

  async getUserCollection(userId: string) {
    const allCards = await this.dataSource.manager.find('cards', {
      order: { rarity: 'DESC', name: 'ASC' }
    });
    
    const userCards = await this.dataSource.manager.find(UserCharacter, {
      where: { user_id: userId }
    });

    const userSkills = await this.dataSource.manager.find(UserSkill, {
      where: { user_id: userId }
    });

    const ownedCounts: Record<string, number> = {};
    for (const uc of userCards) {
      ownedCounts[uc.character_id] = (ownedCounts[uc.character_id] || 0) + 1;
    }
    for (const us of userSkills) {
      ownedCounts[us.skill_id] = (ownedCounts[us.skill_id] || 0) + 1;
    }

    return allCards.map((card: any) => ({
      ...card,
      isOwned: !!ownedCounts[card.id],
      quantity: ownedCounts[card.id] || 0
    }));
  }

  async getAllDices(userId: string) {
    const allDices = await this.dataSource.manager.find('dices', { order: { name: 'ASC' } });
    const userDices = await this.dataSource.manager.find(UserDice, {
      where: { user_id: userId }
    });

    const ownedCounts: Record<string, number> = {};
    for (const ud of userDices) {
      ownedCounts[ud.dice_id] = (ownedCounts[ud.dice_id] || 0) + 1;
    }

    return allDices.map((dice: any) => ({
      ...dice,
      isOwned: !!ownedCounts[dice.id],
      quantity: ownedCounts[dice.id] || 0
    }));
  }

  async sellItem(userId: string, itemType: string, itemId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) throw new BadRequestException('User not found');

      let rarity = 'C';

      let sellAmount = 0;

      if (itemType === 'DICE') {
        const diceDef = await queryRunner.manager.findOne('dices', { where: { id: itemId } });
        if (diceDef) rarity = (diceDef as any).rarity || 'C';

        const dices = await queryRunner.manager.find(UserDice, {
          where: { user_id: userId, dice_id: itemId }
        });
        if (dices.length <= 3) throw new BadRequestException('Not enough copies to sell');
        sellAmount = dices.length - 3;
        await queryRunner.manager.remove(dices.slice(0, sellAmount));
      } else if (itemType === 'CHARACTER' || itemType === 'SKILL') {
        const cardDef = await queryRunner.manager.findOne('cards', { where: { id: itemId } });
        if (cardDef) rarity = (cardDef as any).rarity || 'C';

        if (itemType === 'CHARACTER') {
          const chars = await queryRunner.manager.find(UserCharacter, {
            where: { user_id: userId, character_id: itemId }
          });
          if (chars.length <= 2) throw new BadRequestException('Not enough copies to sell');
          sellAmount = chars.length - 2;
          await queryRunner.manager.remove(chars.slice(0, sellAmount));
        } else {
          const skills = await queryRunner.manager.find(UserSkill, {
            where: { user_id: userId, skill_id: itemId }
          });
          if (skills.length <= 2) throw new BadRequestException('Not enough copies to sell');
          sellAmount = skills.length - 2;
          await queryRunner.manager.remove(skills.slice(0, sellAmount));
        }
      } else {
        throw new BadRequestException('Invalid item type');
      }

      let refundPerItem = 10;
      if (rarity === 'UC') refundPerItem = 20;
      else if (rarity === 'R') refundPerItem = 30;
      else if (rarity === 'SR') refundPerItem = 40;
      else if (rarity === 'SEC') refundPerItem = 50;

      const totalRefund = refundPerItem * sellAmount;
      user.gem += totalRefund;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();
      return { success: true, gemBalance: user.gem, soldItemType: itemType, refunded: totalRefund };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
