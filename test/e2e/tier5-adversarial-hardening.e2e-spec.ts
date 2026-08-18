import { Socket } from 'socket.io-client';
import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { createTestClient, waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2, MOCK_USER_1 } from '../fixtures/mock-users.fixture';
import { GameService } from '../../src/modules/game/game.service';
import { GameEngineService } from '../../src/modules/game/game-engine.service';

describe('Tier 5: Adversarial Hardening (E2E)', () => {
  let context: TestServerContext;
  let gameService: GameService;
  let gameEngineService: GameEngineService;
  let matchFixture: ActiveMatchFixture | null = null;

  beforeAll(async () => {
    context = await setupTestServer();
    gameService = context.app.get(GameService);
    gameEngineService = context.app.get(GameEngineService);
  });

  afterAll(async () => {
    await teardownTestServer(context.app);
  });

  afterEach(async () => {
    if (matchFixture) {
      await disconnectMatchSockets(matchFixture);
      matchFixture = null;
    }
  });

  it('T5.1: Mid-Match Disconnect Forfeit Notification (player_disconnected) & Room Cleanup', async () => {
    matchFixture = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const disconnectNoticePromise = waitForEvent<{ disconnectedPlayerId?: string; playerId?: string; winnerId?: string; roomId?: string }>(
      matchFixture.client2,
      'player_disconnected',
      3000,
    );

    matchFixture.client1.disconnect();

    const notice = await disconnectNoticePromise;
    expect(notice).toBeDefined();
    expect(notice.disconnectedPlayerId || notice.playerId).toBe(MOCK_USER_1.id);

    const matchState = gameService.getMatch(matchFixture.roomId);
    expect(matchState).toBeUndefined();
  });

  it('T5.2: RPS Invalid Payload Rejection (invalid_choice does not declare P2 winner)', async () => {
    matchFixture = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const errorPromise = waitForEvent<{ message: string }>(matchFixture.client1, 'error', 3000);

    matchFixture.client1.emit('rps_choice', {
      roomId: matchFixture.roomId,
      choice: 'invalid_choice' as any,
    });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toBe('Invalid RPS choice');

    const matchState = gameService.getMatch(matchFixture.roomId);
    expect(matchState).toBeDefined();
    expect(matchState?.status).toBe('RPS_PHASE');
    expect(matchState?.firstPlayerId).toBeNull();
    expect(matchState?.winnerId).toBeNull();
  });

  it('T5.3: Active Session Re-entrancy Guard (join_queue rejected if player is in active match)', async () => {
    matchFixture = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const errorPromise = waitForEvent<{ message: string }>(matchFixture.client1, 'error', 3000);

    matchFixture.client1.emit('join_queue', { mode: 'rank' });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toBe('Player already in an active match');
  });

  it('T5.4: Malformed Skill Cost Null Safety (requiredCost: null handled safely)', async () => {
    const isValid = gameEngineService.validateSkillCost(['fire', 'wave'], null as any);
    expect(isValid).toBe(false);

    const isValidUndefined = gameEngineService.validateSkillCost(['fire', 'wave'], undefined as any);
    expect(isValidUndefined).toBe(false);
  });

  it('T5.5: Game Over Fault Tolerance (Clients receive game_over even if DB persistence fails)', async () => {
    matchFixture = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    // Resolve RPS so match transitions to MAIN_PHASE
    const startTurnPromise1 = waitForEvent(matchFixture.client1, 'start_turn', 3000);
    const startTurnPromise2 = waitForEvent(matchFixture.client2, 'start_turn', 3000);

    matchFixture.client1.emit('rps_choice', { roomId: matchFixture.roomId, choice: 'rock' });
    matchFixture.client2.emit('rps_choice', { roomId: matchFixture.roomId, choice: 'scissors' });

    const [startTurn1] = await Promise.all([startTurnPromise1, startTurnPromise2]);
    const matchState = gameService.getMatch(matchFixture.roomId);
    expect(matchState).toBeDefined();
    expect(matchState?.status).toBe('MAIN_PHASE');

    // Force DB persistence error spy
    jest.spyOn(gameService, 'persistRewards').mockRejectedValueOnce(new Error('DB Connection Timeout'));

    // Set opponent HP to low value to guarantee lethal damage
    const opponentId = Object.keys(matchState!.players).find((id) => id !== startTurn1.turnPlayerId)!;
    matchState!.players[opponentId].hp = 5;

    // Roll dice for active player
    const diceRolledPromise = waitForEvent(matchFixture.client1, 'dice_rolled', 3000);
    matchFixture.client1.emit('roll_dice', { roomId: matchFixture.roomId });
    await diceRolledPromise;

    // Get a skill from hand
    const activePlayerState = matchState!.players[startTurn1.turnPlayerId];
    const skillCard = activePlayerState.hand[0];

    // Listen for game_over on both clients
    const gameOverPromise1 = waitForEvent<{ winnerId: string; loserId: string }>(matchFixture.client1, 'game_over', 3000);
    const gameOverPromise2 = waitForEvent<{ winnerId: string; loserId: string }>(matchFixture.client2, 'game_over', 3000);

    matchFixture.client1.emit('play_skill', { roomId: matchFixture.roomId, skillId: skillCard.id });

    const [gameOver1, gameOver2] = await Promise.all([gameOverPromise1, gameOverPromise2]);

    expect(gameOver1).toBeDefined();
    expect(gameOver2).toBeDefined();
    expect(gameOver1.winnerId).toBe(startTurn1.turnPlayerId);
    expect(gameOver2.winnerId).toBe(startTurn1.turnPlayerId);

    // Verify room cleanup
    const finalMatchState = gameService.getMatch(matchFixture.roomId);
    expect(finalMatchState).toBeUndefined();
  });
});
