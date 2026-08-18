import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2, MOCK_USER_1, MOCK_USER_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS } from '../fixtures/mock-decks.fixture';

describe('Tier 3: Full Turn Lifecycle (E2E)', () => {
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

  it('T3.1.1: executes full turn lifecycle sequence sequentially', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    // 0. RPS Phase to establish turn order
    const rpsPromise = waitForEvents([match.client1, match.client2], 'rps_result', 3000);
    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'scissors' });
    const [rps1, rps2] = await rpsPromise;
    expect(rps1.winnerId).toBe(MOCK_USER_1.id);

    // 1. Roll Dice
    const dicePromise = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client1.emit('roll_dice', { roomId: match.roomId });
    const [diceRes1, diceRes2] = await dicePromise;

    expect(diceRes1.playerId).toBe(MOCK_USER_1.id);
    expect(diceRes1.dice).toHaveLength(4);
    expect(diceRes2).toEqual(diceRes1);

    // 2. Play Skill
    const skillPromise = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.slash.id,
      diceUsed: MOCK_SKILLS.slash.cost,
    });
    const [skillRes1, skillRes2] = await skillPromise;

    expect(skillRes1.playerId).toBe(MOCK_USER_1.id);
    expect(skillRes1.skillId).toBe(MOCK_SKILLS.slash.id);
    expect(skillRes1.result.isMiss).toBe(false);
    expect(skillRes1.result.damage).toBe(MOCK_SKILLS.slash.damage);
    expect(skillRes1.result.targetHp).toBe(85);
    expect(skillRes2).toEqual(skillRes1);

    // 3. End Turn
    const turnPromise = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client1.emit('end_turn', { roomId: match.roomId });
    const [turnRes1, turnRes2] = await turnPromise;

    expect(turnRes1.roomId).toBe(match.roomId);
    expect(turnRes1.turnPlayerId).toBe(MOCK_USER_2.id);
    expect(turnRes2).toEqual(turnRes1);
  });
});
