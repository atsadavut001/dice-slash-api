import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { JwtService } from '@nestjs/jwt';
import { Socket, Server } from 'socket.io';

describe('GameGateway Stress & Security Hardening Tests', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let mockServer: any;

  function createMockSocket(id: string, userId: string): any {
    const socket = {
      id,
      data: { userId },
      handshake: { auth: { token: 'Bearer mock' }, headers: {} },
      emit: jest.fn(),
      join: jest.fn(),
    };
    return socket;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        GameService,
        GameEngineService,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue({ sub: 'user_jwt' }),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);

    const socketMap = new Map<string, any>();
    mockServer = {
      sockets: {
        sockets: socketMap,
      },
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };

    gateway.server = mockServer as Server;
  });

  describe('1. Concurrent Socket Requests under High Load', () => {
    it('should handle 100 concurrent join_queue requests without crashing or corrupting queue', async () => {
      const sockets: any[] = [];
      for (let i = 0; i < 100; i++) {
        const s = createMockSocket(`sock_${i}`, `user_${i}`);
        sockets.push(s);
        mockServer.sockets.sockets.set(s.id, s);
      }

      // Execute 100 concurrent join_queue calls
      await Promise.all(
        sockets.map((s) => Promise.resolve(gateway.handleJoinQueue(s as Socket, { mode: 'normal' }))),
      );

      // Exactly 50 matches should have been created (100 players / 2)
      // Queue length should be 0
      const matchesMap = (gameService as any).matches as Map<string, any>;
      expect(matchesMap.size).toBe(50);
      const queueArr = (gameService as any).queue as any[];
      expect(queueArr.length).toBe(0);
    });

    it('should handle rapid concurrent rps_choice events from both players', async () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');
      mockServer.sockets.sockets.set('s1', s1);
      mockServer.sockets.sockets.set('s2', s2);

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      // Fire 20 concurrent rps_choice calls from both players
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' })));
        promises.push(Promise.resolve(gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' })));
      }

      await Promise.all(promises);

      const match = gameService.getMatch(roomId);
      expect(match).toBeDefined();
      expect(match?.status).toBe('MAIN_PHASE');
    });

    it('should handle concurrent roll_dice calls and prevent double rolling', async () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');
      mockServer.sockets.sockets.set('s1', s1);
      mockServer.sockets.sockets.set('s2', s2);

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' });
      gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' });

      const match = gameService.getMatch(roomId)!;
      const turnPlayerId = match.currentTurnPlayerId!;
      const turnSocket = turnPlayerId === 'p1' ? s1 : s2;

      // Send 5 concurrent roll_dice requests
      await Promise.all([
        Promise.resolve(gateway.handleRollDice(turnSocket as Socket, { roomId })),
        Promise.resolve(gateway.handleRollDice(turnSocket as Socket, { roomId })),
        Promise.resolve(gateway.handleRollDice(turnSocket as Socket, { roomId })),
      ]);

      // Player should have rolled dice, and errors should be emitted for duplicates
      const player = match.players[turnPlayerId];
      expect(player.hasRolledDiceThisTurn).toBe(true);
      // At least 2 of the 3 calls should emit error
      expect(turnSocket.emit).toHaveBeenCalledWith('error', expect.anything());
    });
  });

  describe('2. Invalid & Malformed Socket Payloads', () => {
    it('should not crash on null/undefined payloads for all socket events', () => {
      const s = createMockSocket('s1', 'p1');

      expect(() => gateway.handleJoinQueue(s as Socket, null as any)).not.toThrow();
      expect(() => gateway.handleRpsChoice(s as Socket, null as any)).not.toThrow();
      expect(() => gateway.handleRollDice(s as Socket, null as any)).not.toThrow();
      expect(() => gateway.handlePlaySkill(s as Socket, null as any)).not.toThrow();
      expect(() => gateway.handleEndTurn(s as Socket, null as any)).not.toThrow();
      expect(() => gateway.handleJoinCustom(s as Socket, null as any)).not.toThrow();

      expect(s.emit).toHaveBeenCalledWith('error', expect.anything());
    });

    it('should emit error when targeting non-existent roomId', () => {
      const s = createMockSocket('s1', 'p1');

      gateway.handleRollDice(s as Socket, { roomId: 'invalid_room_999' });
      expect(s.emit).toHaveBeenCalledWith('error', { message: 'Match invalid_room_999 not found' });

      gateway.handleEndTurn(s as Socket, { roomId: 'invalid_room_999' });
      expect(s.emit).toHaveBeenCalledWith('error', { message: 'Match invalid_room_999 not found' });
    });

    it('should handle unexpected/malformed data types in payloads gracefully', () => {
      const s = createMockSocket('s1', 'p1');

      gateway.handleRpsChoice(s as Socket, { roomId: 'room1', choice: 'invalid_choice' as any });
      expect(s.emit).toHaveBeenCalledWith('error', expect.anything());
    });
  });

  describe('3. Out-of-Order Socket Events & State Integrity', () => {
    it('should reject roll_dice during RPS_PHASE', () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      // Try rolling dice while still in RPS_PHASE
      gateway.handleRollDice(s1 as Socket, { roomId });
      expect(s1.emit).toHaveBeenCalledWith('error', { message: 'Match is not in MAIN_PHASE' });
    });

    it('should reject play_skill before rolling dice', () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' });
      gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' });

      const match = gameService.getMatch(roomId)!;
      const turnPlayerId = match.currentTurnPlayerId!;
      const turnSocket = turnPlayerId === 'p1' ? s1 : s2;

      // Try playing skill before roll_dice
      gateway.handlePlaySkill(turnSocket as Socket, { roomId, skillId: 'sk_fire_1' });
      expect(turnSocket.emit).toHaveBeenCalledWith('error', { message: 'Must roll dice before playing a skill' });
    });

    it('should reject end_turn during opponent turn', () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' });
      gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' });

      const match = gameService.getMatch(roomId)!;
      const turnPlayerId = match.currentTurnPlayerId!;
      const opponentSocket = turnPlayerId === 'p1' ? s2 : s1;

      // Opponent tries ending turn
      gateway.handleEndTurn(opponentSocket as Socket, { roomId });
      expect(opponentSocket.emit).toHaveBeenCalledWith('error', { message: 'Not your turn' });
    });

    it('CRITICAL CHECK: rps_choice event sent during MAIN_PHASE', () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' });
      gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' });

      const matchBefore = gameService.getMatch(roomId)!;
      expect(matchBefore.status).toBe('MAIN_PHASE');
      expect(matchBefore.turnNumber).toBe(1);

      // Advance turn number
      matchBefore.turnNumber = 5;

      // Late rps_choice from player during MAIN_PHASE
      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'paper' });

      const matchAfter = gameService.getMatch(roomId)!;
      expect(matchAfter.turnNumber).toBe(5);
      expect(s1.emit).toHaveBeenCalledWith('error', { message: 'Match is not in RPS_PHASE' });
    });
  });

  describe('4. Disconnect and Reconnect Scenarios', () => {
    it('should clean up player from queue upon disconnect', () => {
      const s = createMockSocket('s1', 'p1');
      gateway.handleJoinQueue(s as Socket, { mode: 'normal' });

      let queueArr = (gameService as any).queue as any[];
      expect(queueArr.length).toBe(1);

      gateway.handleDisconnect(s as Socket);

      queueArr = (gameService as any).queue as any[];
      expect(queueArr.length).toBe(0);
    });

    it('should update socketId if player re-joins queue before match starts', () => {
      const s1 = createMockSocket('s1', 'p1');
      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });

      const s1New = createMockSocket('s1_new', 'p1');
      gateway.handleJoinQueue(s1New as Socket, { mode: 'normal' });

      const queueArr = (gameService as any).queue as any[];
      expect(queueArr.length).toBe(1);
      expect(queueArr[0].socketId).toBe('s1_new');
    });
  });

  describe('5. Memory Cleanliness & State Lifecycle', () => {
    it('should remove finished matches from memory upon game_over', () => {
      const s1 = createMockSocket('s1', 'p1');
      const s2 = createMockSocket('s2', 'p2');

      gateway.handleJoinQueue(s1 as Socket, { mode: 'normal' });
      gateway.handleJoinQueue(s2 as Socket, { mode: 'normal' });

      const matchesMap = (gameService as any).matches as Map<string, any>;
      const roomId = Array.from(matchesMap.keys())[0];

      gateway.handleRpsChoice(s1 as Socket, { roomId, choice: 'rock' });
      gateway.handleRpsChoice(s2 as Socket, { roomId, choice: 'scissors' });

      const match = gameService.getMatch(roomId)!;
      // Force game over state
      const opponentId = Object.keys(match.players).find((id) => id !== match.currentTurnPlayerId)!;
      match.players[opponentId].hp = 0;

      // Simulate a skill play that triggers game over
      const turnPlayerId = match.currentTurnPlayerId!;
      const turnSocket = turnPlayerId === 'p1' ? s1 : s2;

      gameService.rollDice(roomId, turnPlayerId);
      const skillId = match.players[turnPlayerId].hand[0].id;
      gateway.handlePlaySkill(turnSocket as Socket, { roomId, skillId });

      expect(match.status).toBe('GAME_OVER');
      // Verify match was removed from matchesMap
      expect(matchesMap.has(roomId)).toBe(false);
    });
  });
});
