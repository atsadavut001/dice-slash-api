import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Match } from '../../database/entities/match.entity';

export interface PostGameRewardResult {
  winnerGems: number;
  loserGems: number;
  scoreChange: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Match)
    private readonly matchRepo: Repository<Match>,
  ) {}

  async updateName(userId: string, name: string): Promise<User> {
    if (!name || name.trim() === '') throw new HttpException('Name cannot be empty', HttpStatus.BAD_REQUEST);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    
    // Check if name was updated recently (e.g. 7 days cooldown) if needed
    // For now just update
    user.name = name.trim();
    user.nameUpdatedAt = new Date();
    await this.userRepo.save(user);
    return user;
  }

  async getMatchHistory(userId: string): Promise<any[]> {
    // We only fetch completed matches that contain this user in the state
    // state is JSONB, state->'players' is an object keyed by user IDs
    const matches = await this.matchRepo.createQueryBuilder('match')
      .where("match.status = 'GAME_OVER'")
      .andWhere("match.state->'players' ? :userId", { userId })
      .orderBy('match.updatedAt', 'DESC')
      .limit(5)
      .getMany();
      
    return matches.map(m => {
      const state = m.state as any;
      const opponentId = Object.keys(state.players).find(id => id !== userId);
      const opponent = opponentId ? state.players[opponentId] : null;
      const me = state.players[userId];
      
      const isWinner = state.winnerId === userId;
      const isTie = state.winnerId === 'tie';
      
      return {
        id: m.id,
        mode: m.mode,
        isWinner,
        isTie,
        updatedAt: m.updatedAt,
        opponentName: opponent ? opponent.name : 'Unknown',
        opponentId: opponentId,
        scoreChange: isWinner ? state.gameOverResult?.scoreChange : (state.gameOverResult?.scoreChange ? -state.gameOverResult.scoreChange : 0)
      };
    });
  }

  /**
   * Validate if a string is a valid UUID format to prevent PostgreSQL query errors on guest IDs.
   */
  public isValidUuid(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(id);
  }

  /**
   * Fetch the top N players sorted by rankScore descending.
   */
  async getLeaderboard(limit: number = 20): Promise<User[]> {
    return this.userRepo.find({
      order: { rankScore: 'DESC' },
      take: limit,
      select: { id: true, name: true, rankScore: true, gem: true }, // Do not return sensitive info like password
    });
  }

  /**
   * Calculate post-game rewards (gems & rank score changes) and persist to database for registered users.
   */
  async processPostGameRewards(
    winnerId: string,
    loserId: string,
    hpDifference: number,
    mode: string,
  ): Promise<PostGameRewardResult> {
    let winnerGems = 0;
    let loserGems = 0;
    let scoreChange = 0;

    if (mode === 'rank') {
      winnerGems = Math.floor(Math.random() * 41) + 40; // 40-80 inclusive
      loserGems = Math.floor(Math.random() * 41) + 40;  // 40-80 inclusive
      scoreChange = hpDifference;
    } else if (mode === 'normal') {
      winnerGems = Math.floor(Math.random() * 31) + 30; // 30-60 inclusive
      loserGems = Math.floor(Math.random() * 31) + 30;  // 30-60 inclusive
      scoreChange = 0;
    } else if (mode === 'custom') {
      winnerGems = 0;
      loserGems = 0;
      scoreChange = 0;
    }

    // Persist winner if valid UUID
    if (this.isValidUuid(winnerId)) {
      const winner = await this.userRepo.findOne({ where: { id: winnerId } });
      if (winner) {
        winner.gem = (winner.gem || 0) + winnerGems;
        if (mode === 'rank') {
          winner.rankScore = (winner.rankScore || 0) + scoreChange;
        }
        await this.userRepo.save(winner);
      }
    }

    // Persist loser if valid UUID
    if (this.isValidUuid(loserId)) {
      const loser = await this.userRepo.findOne({ where: { id: loserId } });
      if (loser) {
        loser.gem = (loser.gem || 0) + loserGems;
        if (mode === 'rank') {
          loser.rankScore = Math.max(0, (loser.rankScore || 0) - scoreChange);
        }
        await this.userRepo.save(loser);
      }
    }

    return { winnerGems, loserGems, scoreChange };
  }

  /**
   * Alias method delegating to processPostGameRewards
   */
  async persistRewards(
    winnerId: string,
    loserId: string,
    hpDifference: number,
    mode: string,
  ): Promise<PostGameRewardResult> {
    return this.processPostGameRewards(winnerId, loserId, hpDifference, mode);
  }
}
