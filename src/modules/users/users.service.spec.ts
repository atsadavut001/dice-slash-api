import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  const mockUser1: User = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    googleId: 'google_1',
    name: 'Player One',
    nameUpdatedAt: new Date(),
    role: 'user',
    rankScore: 100,
    gem: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser2: User = {
    id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    googleId: 'google_2',
    name: 'Player Two',
    nameUpdatedAt: new Date(),
    role: 'user',
    rankScore: 50,
    gem: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidUuid', () => {
    it('should return true for valid UUID strings', () => {
      expect(service.isValidUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
      expect(service.isValidUuid('B0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A22')).toBe(true);
    });

    it('should return false for guest or invalid UUID strings', () => {
      expect(service.isValidUuid('guest_123')).toBe(false);
      expect(service.isValidUuid('socket_abc')).toBe(false);
      expect(service.isValidUuid('u1')).toBe(false);
      expect(service.isValidUuid('')).toBe(false);
      expect(service.isValidUuid(null as any)).toBe(false);
    });
  });

  describe('processPostGameRewards', () => {
    it('should handle Ranked mode rewards (40-80 gems, rankScore +/- hpDiff)', async () => {
      const u1 = { ...mockUser1 };
      const u2 = { ...mockUser2 };

      userRepo.findOne.mockImplementation(async (options: any) => {
        if (options.where.id === u1.id) return u1;
        if (options.where.id === u2.id) return u2;
        return null;
      });
      userRepo.save.mockImplementation(async (u: any) => u);

      const hpDiff = 35;
      const result = await service.processPostGameRewards(u1.id, u2.id, hpDiff, 'rank');

      expect(result.scoreChange).toBe(hpDiff);
      expect(result.winnerGems).toBeGreaterThanOrEqual(40);
      expect(result.winnerGems).toBeLessThanOrEqual(80);
      expect(result.loserGems).toBeGreaterThanOrEqual(40);
      expect(result.loserGems).toBeLessThanOrEqual(80);

      expect(userRepo.findOne).toHaveBeenCalledTimes(2);
      expect(userRepo.save).toHaveBeenCalledTimes(2);

      expect(u1.gem).toBe(1000 + result.winnerGems);
      expect(u1.rankScore).toBe(100 + hpDiff);

      expect(u2.gem).toBe(500 + result.loserGems);
      expect(u2.rankScore).toBe(50 - hpDiff); // 15
    });

    it('should clamp loser rankScore at minimum 0 in Ranked mode', async () => {
      const u1 = { ...mockUser1 };
      const u2 = { ...mockUser2, rankScore: 20 };

      userRepo.findOne.mockImplementation(async (options: any) => {
        if (options.where.id === u1.id) return u1;
        if (options.where.id === u2.id) return u2;
        return null;
      });
      userRepo.save.mockImplementation(async (u: any) => u);

      const hpDiff = 50; // Greater than u2.rankScore (20)
      const result = await service.processPostGameRewards(u1.id, u2.id, hpDiff, 'rank');

      expect(result.scoreChange).toBe(50);
      expect(u2.rankScore).toBe(0);
    });

    it('should handle Normal mode rewards (30-60 gems, scoreChange = 0)', async () => {
      const u1 = { ...mockUser1 };
      const u2 = { ...mockUser2 };

      userRepo.findOne.mockImplementation(async (options: any) => {
        if (options.where.id === u1.id) return u1;
        if (options.where.id === u2.id) return u2;
        return null;
      });
      userRepo.save.mockImplementation(async (u: any) => u);

      const result = await service.processPostGameRewards(u1.id, u2.id, 40, 'normal');

      expect(result.scoreChange).toBe(0);
      expect(result.winnerGems).toBeGreaterThanOrEqual(30);
      expect(result.winnerGems).toBeLessThanOrEqual(60);
      expect(result.loserGems).toBeGreaterThanOrEqual(30);
      expect(result.loserGems).toBeLessThanOrEqual(60);

      expect(u1.rankScore).toBe(100); // unchanged
      expect(u2.rankScore).toBe(50);  // unchanged
      expect(u1.gem).toBe(1000 + result.winnerGems);
      expect(u2.gem).toBe(500 + result.loserGems);
    });

    it('should handle Custom mode (0 gems, 0 scoreChange)', async () => {
      const result = await service.processPostGameRewards(mockUser1.id, mockUser2.id, 25, 'custom');

      expect(result.winnerGems).toBe(0);
      expect(result.loserGems).toBe(0);
      expect(result.scoreChange).toBe(0);
    });

    it('should gracefully handle guest / non-UUID player IDs without DB calls', async () => {
      const winnerGuest = 'guest_socket_123';
      const loserGuest = 'guest_socket_456';

      const result = await service.processPostGameRewards(winnerGuest, loserGuest, 30, 'rank');

      expect(result.scoreChange).toBe(30);
      expect(result.winnerGems).toBeGreaterThanOrEqual(40);
      expect(result.winnerGems).toBeLessThanOrEqual(80);
      expect(result.loserGems).toBeGreaterThanOrEqual(40);
      expect(result.loserGems).toBeLessThanOrEqual(80);

      expect(userRepo.findOne).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should handle mixed registered UUID user and guest player', async () => {
      const u1 = { ...mockUser1 };
      const guestLoser = 'guest_99';

      userRepo.findOne.mockImplementation(async (options: any) => {
        if (options.where.id === u1.id) return u1;
        return null;
      });
      userRepo.save.mockImplementation(async (u: any) => u);

      const result = await service.processPostGameRewards(u1.id, guestLoser, 20, 'rank');

      expect(result.scoreChange).toBe(20);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: u1.id } });
      expect(userRepo.save).toHaveBeenCalledWith(u1);
      expect(u1.rankScore).toBe(120);
    });

    it('should handle user not found in DB gracefully', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const validUuidWinner = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const validUuidLoser = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

      const result = await service.processPostGameRewards(validUuidWinner, validUuidLoser, 10, 'normal');

      expect(result.winnerGems).toBeGreaterThanOrEqual(30);
      expect(result.loserGems).toBeGreaterThanOrEqual(30);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    describe('1000-iteration empirical stress testing', () => {
      it('should strictly adhere to [40, 80] gem rewards for Ranked mode across 1000 iterations', async () => {
        let minWinnerGems = Infinity;
        let maxWinnerGems = -Infinity;
        let minLoserGems = Infinity;
        let maxLoserGems = -Infinity;

        for (let i = 0; i < 1000; i++) {
          const res = await service.processPostGameRewards('guest1', 'guest2', 15, 'rank');

          expect(res.winnerGems).toBeGreaterThanOrEqual(40);
          expect(res.winnerGems).toBeLessThanOrEqual(80);
          expect(res.loserGems).toBeGreaterThanOrEqual(40);
          expect(res.loserGems).toBeLessThanOrEqual(80);
          expect(Number.isInteger(res.winnerGems)).toBe(true);
          expect(Number.isInteger(res.loserGems)).toBe(true);

          if (res.winnerGems < minWinnerGems) minWinnerGems = res.winnerGems;
          if (res.winnerGems > maxWinnerGems) maxWinnerGems = res.winnerGems;
          if (res.loserGems < minLoserGems) minLoserGems = res.loserGems;
          if (res.loserGems > maxLoserGems) maxLoserGems = res.loserGems;
        }

        expect(minWinnerGems).toBe(40);
        expect(maxWinnerGems).toBe(80);
        expect(minLoserGems).toBe(40);
        expect(maxLoserGems).toBe(80);
      });

      it('should strictly adhere to [30, 60] gem rewards for Normal mode across 1000 iterations', async () => {
        let minWinnerGems = Infinity;
        let maxWinnerGems = -Infinity;
        let minLoserGems = Infinity;
        let maxLoserGems = -Infinity;

        for (let i = 0; i < 1000; i++) {
          const res = await service.processPostGameRewards('guest1', 'guest2', 15, 'normal');

          expect(res.winnerGems).toBeGreaterThanOrEqual(30);
          expect(res.winnerGems).toBeLessThanOrEqual(60);
          expect(res.loserGems).toBeGreaterThanOrEqual(30);
          expect(res.loserGems).toBeLessThanOrEqual(60);
          expect(Number.isInteger(res.winnerGems)).toBe(true);
          expect(Number.isInteger(res.loserGems)).toBe(true);

          if (res.winnerGems < minWinnerGems) minWinnerGems = res.winnerGems;
          if (res.winnerGems > maxWinnerGems) maxWinnerGems = res.winnerGems;
          if (res.loserGems < minLoserGems) minLoserGems = res.loserGems;
          if (res.loserGems > maxLoserGems) maxLoserGems = res.loserGems;
        }

        expect(minWinnerGems).toBe(30);
        expect(maxWinnerGems).toBe(60);
        expect(minLoserGems).toBe(30);
        expect(maxLoserGems).toBe(60);
      });

      it('should verify winner rank score updates correctly and loser rank score never drops below 0 across randomized inputs', async () => {
        for (let i = 0; i < 500; i++) {
          const initialWinnerScore = Math.floor(Math.random() * 500);
          const initialLoserScore = Math.floor(Math.random() * 50);
          const hpDiff = Math.floor(Math.random() * 100) + 1;

          const winner: User = { ...mockUser1, rankScore: initialWinnerScore };
          const loser: User = { ...mockUser2, rankScore: initialLoserScore };

          userRepo.findOne.mockImplementation(async (options: any) => {
            if (options.where.id === winner.id) return winner;
            if (options.where.id === loser.id) return loser;
            return null;
          });
          userRepo.save.mockImplementation(async (u: any) => u);

          const res = await service.processPostGameRewards(winner.id, loser.id, hpDiff, 'rank');

          expect(res.scoreChange).toBe(hpDiff);
          expect(winner.rankScore).toBe(initialWinnerScore + hpDiff);
          expect(loser.rankScore).toBeGreaterThanOrEqual(0);
          expect(loser.rankScore).toBe(Math.max(0, initialLoserScore - hpDiff));
        }
      });
    });
  });

  describe('persistRewards alias', () => {
    it('should delegate to processPostGameRewards', async () => {
      const spy = jest.spyOn(service, 'processPostGameRewards').mockResolvedValue({
        winnerGems: 50,
        loserGems: 45,
        scoreChange: 15,
      });

      const res = await service.persistRewards('w1', 'l1', 15, 'rank');
      expect(spy).toHaveBeenCalledWith('w1', 'l1', 15, 'rank');
      expect(res).toEqual({ winnerGems: 50, loserGems: 45, scoreChange: 15 });
    });
  });
});
