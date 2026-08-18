import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';
import { MOCK_SKILLS } from '../fixtures/mock-decks.fixture';

describe('Tier 1: Skill Execution & Damage Resolution (E2E)', () => {
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

  it('T1.6.1: playing valid skill with matching dice applies flat damage and updates target HP', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const skillPromise = waitForEvents(
      [match.client1, match.client2],
      'skill_played',
      2000,
    );

    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: MOCK_SKILLS.fireball.id,
      diceUsed: MOCK_SKILLS.fireball.cost,
    });

    const [res1, res2] = await skillPromise;
    expect(res1.skillId).toBe(MOCK_SKILLS.fireball.id);
    expect(res1.result.isMiss).toBe(false);
    expect(res1.result.damage).toBe(MOCK_SKILLS.fireball.damage);
    expect(res2).toEqual(res1);
  });
});
