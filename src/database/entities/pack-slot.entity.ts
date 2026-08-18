import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ShopPack } from './shop-pack.entity';

@Entity('pack_slots')
export class PackSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShopPack, (pack) => pack.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pack_id' })
  pack: ShopPack;

  @Column({ type: 'int' })
  slotNumber: number;

  @Column({ type: 'float', default: 0 })
  c_rate: number;

  @Column({ type: 'float', default: 0 })
  uc_rate: number;

  @Column({ type: 'float', default: 0 })
  r_rate: number;

  @Column({ type: 'float', default: 0 })
  sr_rate: number;

  @Column({ type: 'float', default: 0 })
  sec_rate: number;
}
