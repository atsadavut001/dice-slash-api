import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('decks')
export class Deck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @Column()
  name: string;

  @Column({ default: false })
  is_main: boolean;

  @Column({ nullable: true })
  character_id: string;

  @Column('simple-array', { nullable: true })
  skills: string[];

  @Column({ nullable: true })
  character_dice_id: string;

  @Column('simple-array', { nullable: true })
  element_dice: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
