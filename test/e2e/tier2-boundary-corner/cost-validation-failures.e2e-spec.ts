import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS, canSatisfySkillCost } from '../fixtures/mock-decks.fixture';

describe('Tier 2: Skill Cost Validation Failures & Miss Mechanics (E2E)', () => {
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

  it('T2.3.1: fixture helper canSatisfySkillCost correctly validates element matching', () => {
    const required = ['fire', 'fire'];
    expect(canSatisfySkillCost(required, ['fire', 'fire', 'water'])).toBe(true);
    expect(canSatisfySkillCost(required, ['fire', 'water', 'wind'])).toBe(false);
  });

  it('T2.3.2: playing skill with mismatched element dice results in Miss (0 damage)', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const skillPromise = waitForEvents<[
      { playerId: string; skillId: string; result: { damage: number; isMiss: boolean; targetHp: number } },
      { playerId: string; skillId: string; result: { damage: number; isMiss: boolean; targetHp: number } },
    ]>(
      [match.client1, match.client2],
      'skill_played',
      2000,
    );

    // Mismatched cost: Fireball requires ['fire', 'fire'], passing ['water', 'wind']
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.fireball.id,
      diceUsed: ['water', 'wind'],
    });

    const [res1, res2] = await skillPromise;
    expect(res1).toEqual(res2);
    expect(res1.result.isMiss).toBe(true);
    expect(res1.result.damage).toBe(0);
  });
});
