import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { UsersService } from '../users/users.service';
import { Deck } from '../../database/entities/deck.entity';
import { Card } from '../../database/entities/card.entity';
import { Dice } from '../../database/entities/dice.entity';

describe('GameService', () => {
  let service: GameService;
  let engine: GameEngineService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      processPostGameRewards: jest.fn().mockResolvedValue({
        winnerGems: 50,
        loserGems: 45,
        scoreChange: 20,
      }),
      persistRewards: jest.fn().mockResolvedValue({
        winnerGems: 50,
        loserGems: 45,
        scoreChange: 20,
      }),
      isValidUuid: jest.fn(),
    };

    const mockDeckRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const mockCardRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockDiceRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        GameEngineService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getRepositoryToken(Deck),
          useValue: mockDeckRepo,
        },
        {
          provide: getRepositoryToken(Card),
          useValue: mockCardRepo,
        },
        {
          provide: getRepositoryToken(Dice),
          useValue: mockDiceRepo,
        },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
    engine = module.get<GameEngineService>(GameEngineService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(engine).toBeDefined();
  });

  describe('queue & match creation', () => {
    it('should return null when only 1 player joins queue', async () => {
      const res = await service.joinQueue('user_1', 'sock_1', 'normal');
      expect(res).toBeNull();
    });

    it('should match two players in queue and return initialized match', async () => {
      await service.joinQueue('user_1', 'sock_1', 'normal');
      const match = await service.joinQueue('user_2', 'sock_2', 'normal');

      expect(match).not.toBeNull();
      expect(match?.status).toBe('RPS_PHASE');
      expect(match?.players['user_1']).toBeDefined();
      expect(match?.players['user_2']).toBeDefined();
    });

    it('should allow player to leave queue', async () => {
      await service.joinQueue('user_1', 'sock_1', 'normal');
      service.leaveQueue('user_1');
      const match = await service.joinQueue('user_2', 'sock_2', 'normal');
      expect(match).toBeNull();
    });
  });

  describe('custom rooms', () => {
    it('should create and join a custom room', async () => {
      const roomId = await service.createCustomRoom('host_1', 'sock_h');
      expect(roomId).toBeDefined();
      expect(roomId.length).toBe(6);

      const match = await service.joinCustomRoom(roomId, 'guest_1', 'sock_g');
      expect(match).not.toBeNull();
      expect(match?.mode).toBe('custom');
      expect(match?.players['host_1']).toBeDefined();
      expect(match?.players['guest_1']).toBeDefined();
    });
  });

  describe('in-memory session delegate operations', () => {
    let roomId: string;

    beforeEach(async () => {
      await service.joinQueue('u1', 's1', 'rank');
      const match = await service.joinQueue('u2', 's2', 'rank');
      roomId = match!.roomId;
    });

    it('should retrieve match by roomId', () => {
      const match = service.getMatch(roomId);
      expect(match).toBeDefined();
      expect(match?.roomId).toBe(roomId);
    });

    it('should delegate RPS, dice rolling, skill playing, and ending turn', () => {
      service.resolveRps(roomId, 'u1', 'rock');
      const { result, match } = service.resolveRps(roomId, 'u2', 'scissors');
      expect(result.winnerId).toBe('u1');
      expect(match.status).toBe('MAIN_PHASE');

      const { roll } = service.rollDice(roomId, 'u1');
      expect(roll.elements.length).toBe(3);

      const skillId = match.players['u1'].hand[0].id;
      const { actionResult } = service.playSkill(roomId, 'u1', skillId);
      expect(actionResult.playerId).toBe('u1');

      const updatedMatch = service.endTurn(roomId, 'u1');
      expect(updatedMatch.currentTurnPlayerId).toBe('u2');

      service.removeMatch(roomId);
      expect(service.getMatch(roomId)).toBeUndefined();
    });
  });

  describe('persistRewards delegation', () => {
    it('should delegate post-game reward persistence to UsersService', async () => {
      const winnerId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const loserId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
      const hpDifference = 25;
      const mode = 'rank';

      const result = await service.persistRewards(winnerId, loserId, hpDifference, mode);

      expect(usersService.processPostGameRewards).toHaveBeenCalledWith(
        winnerId,
        loserId,
        hpDifference,
        mode,
      );
      expect(result).toEqual({
        winnerGems: 50,
        loserGems: 45,
        scoreChange: 20,
      });
    });
  });
});
