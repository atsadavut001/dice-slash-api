import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2, MOCK_USER_1, MOCK_USER_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS } from '../fixtures/mock-decks.fixture';

describe('Tier 4: Complete Match Simulation — Normal Mode (E2E)', () => {
  let context: TestServerContext;
  let match: ActiveMatchFixture;

  beforeAll(async () => {
    context = await setupTestServer();
  });

  afterAll(async () => {
    await teardownTestServer(context.app);
  });

  afterEach(async () => {
    if (match) {
      await disconnectMatchSockets(match);
    }
  });

  it('T4.2.1: complete Normal match from queue join to HP <= 0 and Normal reward payout', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2, 'normal');
    expect(match.mode).toBe('normal');

    // RPS Phase
    const rpsPromise = waitForEvents([match.client1, match.client2], 'rps_result', 3000);
    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'paper' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    const [rpsRes] = await rpsPromise;
    expect(rpsRes.winnerId).toBe(MOCK_USER_1.id);

    // Combat Phase: Simulate turns until P2 HP reaches <= 0 (4 turns x 25 damage Fireball = 100 damage)
    for (let turn = 1; turn <= 3; turn++) {
      const diceP1 = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
      match.client1.emit('roll_dice', { roomId: match.roomId });
      await diceP1;

      const skillP1 = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
      match.client1.emit('play_skill', {
        roomId: match.roomId,
        skillId: MOCK_SKILLS.fireball.id,
        diceUsed: MOCK_SKILLS.fireball.cost,
      });
      await skillP1;

      const endP1 = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
      match.client1.emit('end_turn', { roomId: match.roomId });
      await endP1;

      // P2 passes turn back
      const endP2 = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
      match.client2.emit('end_turn', { roomId: match.roomId });
      await endP2;
    }

    // Final Fatal Blow (Turn 4 P1 attack: 25 damage -> P2 HP 0)
    const diceFatal = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client1.emit('roll_dice', { roomId: match.roomId });
    await diceFatal;

    const gameOverPromise = waitForEvents([match.client1, match.client2], 'game_over', 3000);
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.fireball.id,
      diceUsed: MOCK_SKILLS.fireball.cost,
    });

    const [res1, res2] = await gameOverPromise;
    expect(res1.winnerId).toBe(MOCK_USER_1.id);
    expect(res1.loserId).toBe(MOCK_USER_2.id);
    expect(res1.hpDifference).toBe(100);
    expect(res1.gemsEarned).toBeGreaterThanOrEqual(30);
    expect(res1.gemsEarned).toBeLessThanOrEqual(60);
    expect(res1.rankPointsChanged).toBe(0); // Normal mode does not alter rank points
    expect(res2).toEqual(res1);
  });
});
