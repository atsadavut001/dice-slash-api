import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { MatchState } from '../../modules/game/game-engine.types';

@Entity('matches')
export class Match {
  @PrimaryColumn('varchar')
  id: string;

  @Column()
  mode: string;

  @Column()
  status: string;

  @Column({ type: 'jsonb' })
  state: MatchState;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
