import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CardType {
  CHARACTER = 'CHARACTER',
  SKILL = 'SKILL',
}

export enum CardRarity {
  C = 'C',
  UC = 'UC',
  R = 'R',
  SR = 'SR',
  SEC = 'SEC',
}

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_code', unique: true, nullable: true }) // nullable temporarily to avoid crashing on existing rows, though empty now
  cardCode: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: CardType;

  @Column('simple-array')
  colors: string[];

  @Column({ type: 'varchar' })
  rarity: CardRarity;

  @Column()
  imageUrl: string;

  @Column({ type: 'int', nullable: true })
  hp: number;

  @Column({ type: 'json', nullable: true })
  cost: any;

  @Column({ type: 'int', nullable: true })
  cooldown: number;

  @Column({ type: 'text', nullable: true })
  abilitiesText: string;

  @Column({ type: 'json', nullable: true })
  abilitiesJson: any;

  @Column('simple-array', { nullable: true })
  weakness: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
