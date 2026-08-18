import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'google_id', unique: true })
  googleId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'name_updated_at', nullable: true })
  nameUpdatedAt: Date;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Column({ name: 'rank_score', type: 'int', default: 100 })
  rankScore: number;

  @Column({ type: 'int', default: 1000 })
  gem: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
