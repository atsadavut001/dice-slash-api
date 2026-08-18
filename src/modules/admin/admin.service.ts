import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Card } from '../../database/entities/card.entity';
import { ShopPack } from '../../database/entities/shop-pack.entity';
import { PackSlot } from '../../database/entities/pack-slot.entity';
import { PackCard } from '../../database/entities/pack-card.entity';
import { PackDice } from '../../database/entities/pack-dice.entity';
import { User } from '../../database/entities/user.entity';
import { Dice } from '../../database/entities/dice.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Card) private cardRepo: Repository<Card>,
    @InjectRepository(ShopPack) private packRepo: Repository<ShopPack>,
    @InjectRepository(PackSlot) private packSlotRepo: Repository<PackSlot>,
    @InjectRepository(PackCard) private packCardRepo: Repository<PackCard>,
    @InjectRepository(PackDice) private packDiceRepo: Repository<PackDice>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Dice) private diceRepo: Repository<Dice>,
  ) {}

  // --- CARDS ---
  async getAllCards(page = 1, limit = 20, search = '', type = '', rarity = '', color = '') {
    const skip = (page - 1) * limit;
    
    const qb = this.cardRepo.createQueryBuilder('card');
    
    if (search) {
      qb.andWhere('(card.name ILIKE :search OR card.cardCode ILIKE :search)', { search: `%${search}%` });
    }
    if (type) {
      qb.andWhere('card.type = :type', { type });
    }
    if (rarity) {
      qb.andWhere('card.rarity = :rarity', { rarity });
    }
    if (color) {
      qb.andWhere('card.colors LIKE :color', { color: `%${color}%` });
    }
    
    const [data, total] = await qb.orderBy('card.createdAt', 'DESC')
                                  .skip(skip)
                                  .take(limit)
                                  .getManyAndCount();
    
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getCardById(id: string) {
    return this.cardRepo.findOne({ where: { id } });
  }

  async createCard(data: Partial<Card>) {
    const card = this.cardRepo.create(data);
    return this.cardRepo.save(card);
  }

  async updateCard(id: string, data: Partial<Card>) {
    await this.cardRepo.update(id, data);
    return this.cardRepo.findOne({ where: { id } });
  }

  async deleteCard(id: string) {
    return this.cardRepo.delete(id);
  }

  // --- PACKS ---
  async getAllPacks(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search ? { name: ILike(`%${search}%`) } : {};
    
    const [data, total] = await this.packRepo.findAndCount({
      where,
      relations: { slots: true, packCards: { card: true } },
      skip,
      take: limit,
      order: { id: 'DESC' } // fallback order
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPackById(id: string) {
    return this.packRepo.findOne({ where: { id }, relations: { slots: true, packCards: { card: true }, packDices: { dice: true } } });
  }

  async createPack(data: Partial<ShopPack>, slots: Partial<PackSlot>[], cards: string[], dices: string[] = []) {
    const pack = this.packRepo.create(data);
    await this.packRepo.save(pack);

    if (slots && slots.length > 0) {
      const newSlots = slots.map(s => this.packSlotRepo.create({ ...s, pack }));
      await this.packSlotRepo.save(newSlots);
    }

    if (cards && cards.length > 0) {
      for (const cardId of cards) {
        const c = await this.cardRepo.findOne({ where: { id: cardId } });
        if (c) {
          await this.packCardRepo.save(this.packCardRepo.create({ pack, card: c }));
        }
      }
    }

    if (dices && dices.length > 0) {
      for (const diceId of dices) {
        const d = await this.diceRepo.findOne({ where: { id: diceId } });
        if (d) {
          await this.packDiceRepo.save(this.packDiceRepo.create({ pack, dice: d }));
        }
      }
    }

    return this.packRepo.findOne({ where: { id: pack.id }, relations: { slots: true, packCards: { card: true }, packDices: { dice: true } } });
  }

  async updatePack(id: string, data: Partial<ShopPack>, slots: Partial<PackSlot>[], cards: string[], dices: string[] = []) {
    await this.packRepo.update(id, data);
    const pack = await this.packRepo.findOne({ where: { id } });
    
    if (pack) {
      await this.packSlotRepo.delete({ pack: { id } });
      await this.packCardRepo.delete({ pack: { id } });
      await this.packDiceRepo.delete({ pack: { id } });
      
      if (slots && slots.length > 0) {
        const newSlots = slots.map(s => this.packSlotRepo.create({ ...s, pack }));
        await this.packSlotRepo.save(newSlots);
      }
      
      if (cards && cards.length > 0) {
        for (const cardId of cards) {
          const c = await this.cardRepo.findOne({ where: { id: cardId } });
          if (c) {
            await this.packCardRepo.save(this.packCardRepo.create({ pack, card: c }));
          }
        }
      }

      if (dices && dices.length > 0) {
        for (const diceId of dices) {
          const d = await this.diceRepo.findOne({ where: { id: diceId } });
          if (d) {
            await this.packDiceRepo.save(this.packDiceRepo.create({ pack, dice: d }));
          }
        }
      }
    }
    
    return this.packRepo.findOne({ where: { id }, relations: { slots: true, packCards: { card: true } } });
  }

  async deletePack(id: string) {
    return this.packRepo.delete(id);
  }

  // --- MEMBERS ---
  async getAllUsers(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search ? [
      { name: ILike(`%${search}%`) },
      { googleId: ILike(`%${search}%`) }
    ] : {};
    
    const [data, total] = await this.userRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });
    
    
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // --- DICES ---
  async getAllDices(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search ? { name: ILike(`%${search}%`) } : {};
    
    const [data, total] = await this.diceRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' }
    });
    
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDiceById(id: string) {
    return this.diceRepo.findOne({ where: { id } });
  }

  async createDice(data: Partial<Dice>) {
    const dice = this.diceRepo.create(data);
    return this.diceRepo.save(dice);
  }

  async updateDice(id: string, data: Partial<Dice>) {
    await this.diceRepo.update(id, data);
    return this.diceRepo.findOne({ where: { id } });
  }

  async deleteDice(id: string) {
    return this.diceRepo.delete(id);
  }
}
