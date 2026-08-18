import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { ShopPack } from './shop-pack.entity';

@Entity('purchase_logs')
export class PurchaseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ShopPack)
  @JoinColumn({ name: 'pack_id' })
  pack: ShopPack;

  @Column({ type: 'int', default: 1 })
  amount: number;

  @CreateDateColumn()
  purchased_at: Date;
}
