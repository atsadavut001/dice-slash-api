import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ShopPack } from './shop-pack.entity';
import { Card } from './card.entity';

@Entity('pack_cards')
export class PackCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ShopPack, (pack) => pack.packCards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pack_id' })
  pack: ShopPack;

  @ManyToOne(() => Card, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
