import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Game Over Conditions & Rewards (E2E)', () => {
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

  it('T1.7.1: reducing target HP <= 0 triggers game_over event with reward metrics', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const gameOverPromise = waitForEvents(
      [match.client1, match.client2],
      'game_over',
      2000,
    );

    // Simulate fatal strike
    match.client1.emit('play_skill', {
      roomId: match.roomId,
      skillId: 'fatal_slash',
      diceUsed: ['physical'],
    });

    const [res1, res2] = await gameOverPromise;
    expect(res1.winnerId).toBeDefined();
    expect(res1.loserId).toBeDefined();
    expect(res1.hpDifference).toBeGreaterThanOrEqual(0);
    expect(res2).toEqual(res1);
  });
});
