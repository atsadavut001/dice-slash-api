import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { PackSlot } from './pack-slot.entity';
import { PackCard } from './pack-card.entity';
import { PackDice } from './pack-dice.entity';

@Entity('shop_packs')
export class ShopPack {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ['RANDOM', 'FIXED'] })
  type: string;

  @Column({ type: 'int' })
  price: number;

  @Column()
  image: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_limited: boolean;

  @Column({ type: 'int', default: 0 })
  limit_amount: number;

  @OneToMany(() => PackSlot, (slot) => slot.pack, { cascade: true })
  slots: PackSlot[];

  @OneToMany(() => PackCard, (pc) => pc.pack, { cascade: true })
  packCards: PackCard[];

  @OneToMany(() => PackDice, (pd) => pd.pack, { cascade: true })
  packDices: PackDice[];
}
