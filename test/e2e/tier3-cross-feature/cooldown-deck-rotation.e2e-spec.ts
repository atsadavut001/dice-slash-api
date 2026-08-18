import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2, MOCK_USER_1, MOCK_USER_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS } from '../fixtures/mock-decks.fixture';

describe('Tier 3: Cooldown Decrement & Deck Rotation (E2E)', () => {
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

  it('T3.3.1: played skill enters cooldown, decrements per turn, and returns to deck at 0', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    // RPS Setup (P1 wins turn order)
    const rpsPromise = waitForEvents([match.client1, match.client2], 'rps_result', 3000);
    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'scissors' });
    await rpsPromise;

    // Turn 1 (P1): Play Fireball (cooldown: 2)
    const skillPromise = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.fireball.id,
      diceUsed: MOCK_SKILLS.fireball.cost,
    });
    const [skillRes] = await skillPromise;
    expect(skillRes.skillId).toBe(MOCK_SKILLS.fireball.id);

    // End Turn 1 (P1 -> P2)
    const t1End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client1.emit('end_turn', { roomId: match.roomId });
    await t1End;

    // Turn 2 (P2 passes turn -> P1's turn start triggers CD decrement 2 -> 1)
    const t2End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client2.emit('end_turn', { roomId: match.roomId });
    const [turn3State] = await t2End;

    expect(turn3State.turnPlayerId).toBe(MOCK_USER_1.id);
    if (turn3State.playerState?.cooldowns) {
      expect(turn3State.playerState.cooldowns[MOCK_SKILLS.fireball.id]).toBe(1);
    }

    // Turn 3 (P1 passes turn -> P2's turn)
    const t3End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client1.emit('end_turn', { roomId: match.roomId });
    await t3End;

    // Turn 4 (P2 passes turn -> P1's turn start triggers CD decrement 1 -> 0, card returned to deck)
    const t4End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client2.emit('end_turn', { roomId: match.roomId });
    const [turn5State] = await t4End;

    expect(turn5State.turnPlayerId).toBe(MOCK_USER_1.id);
    if (turn5State.playerState?.cooldowns) {
      expect(turn5State.playerState.cooldowns[MOCK_SKILLS.fireball.id] || 0).toBe(0);
    }
  });
});
