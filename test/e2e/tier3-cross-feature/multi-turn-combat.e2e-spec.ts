import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2, MOCK_USER_1, MOCK_USER_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS } from '../fixtures/mock-decks.fixture';

describe('Tier 3: Multi-Turn Combat & HP State Accumulation (E2E)', () => {
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

  it('T3.2.1: simulates 4 alternating combat turns with accumulated HP reduction', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    // RPS Setup (P1 wins)
    const rpsPromise = waitForEvents([match.client1, match.client2], 'rps_result', 3000);
    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'scissors' });
    await rpsPromise;

    // Turn 1: P1 attacks P2 with Slash (15 damage -> P2 HP 85)
    const diceP1 = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client1.emit('roll_dice', { roomId: match.roomId });
    await diceP1;

    const skillP1_t1 = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.slash.id,
      diceUsed: MOCK_SKILLS.slash.cost,
    });
    const [res1] = await skillP1_t1;
    expect(res1.result.targetHp).toBe(85);

    const turn1End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client1.emit('end_turn', { roomId: match.roomId });
    const [t1TurnState] = await turn1End;
    expect(t1TurnState.turnPlayerId).toBe(MOCK_USER_2.id);

    // Turn 2: P2 attacks P1 with Fireball (25 damage -> P1 HP 75)
    const diceP2 = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client2.emit('roll_dice', { roomId: match.roomId });
    await diceP2;

    const skillP2_t2 = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client2.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.fireball.id,
      diceUsed: MOCK_SKILLS.fireball.cost,
    });
    const [res2] = await skillP2_t2;
    expect(res2.result.targetHp).toBe(75);

    const turn2End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client2.emit('end_turn', { roomId: match.roomId });
    const [t2TurnState] = await turn2End;
    expect(t2TurnState.turnPlayerId).toBe(MOCK_USER_1.id);

    // Turn 3: P1 attacks P2 with Slash (15 damage -> P2 HP 70)
    const diceP1_t3 = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client1.emit('roll_dice', { roomId: match.roomId });
    await diceP1_t3;

    const skillP1_t3 = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.slash.id,
      diceUsed: MOCK_SKILLS.slash.cost,
    });
    const [res3] = await skillP1_t3;
    expect(res3.result.targetHp).toBe(70);

    const turn3End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client1.emit('end_turn', { roomId: match.roomId });
    const [t3TurnState] = await turn3End;
    expect(t3TurnState.turnPlayerId).toBe(MOCK_USER_2.id);

    // Turn 4: P2 attacks P1 with Slash (15 damage -> P1 HP 60)
    const diceP2_t4 = waitForEvents([match.client1, match.client2], 'dice_rolled', 3000);
    match.client2.emit('roll_dice', { roomId: match.roomId });
    await diceP2_t4;

    const skillP2_t4 = waitForEvents([match.client1, match.client2], 'skill_played', 3000);
    match.client2.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.slash.id,
      diceUsed: MOCK_SKILLS.slash.cost,
    });
    const [res4] = await skillP2_t4;
    expect(res4.result.targetHp).toBe(60);

    const turn4End = waitForEvents([match.client1, match.client2], 'start_turn', 3000);
    match.client2.emit('end_turn', { roomId: match.roomId });
    const [t4TurnState] = await turn4End;
    expect(t4TurnState.turnPlayerId).toBe(MOCK_USER_1.id);
  });
});
