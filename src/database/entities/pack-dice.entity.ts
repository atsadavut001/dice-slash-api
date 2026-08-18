import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShopPack } from './shop-pack.entity';
import { Dice } from './dice.entity';

@Entity('pack_dices')
export class PackDice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShopPack, (pack) => pack.packDices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pack_id' })
  pack: ShopPack;

  @ManyToOne(() => Dice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dice_id' })
  dice: Dice;
}
