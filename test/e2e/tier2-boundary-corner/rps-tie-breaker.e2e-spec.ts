import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 2: RPS Tie-Breaker Resolution (E2E)', () => {
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

  it('T2.4.1: matching RPS choices emit tie result with winnerId null', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const rpsPromise = waitForEvents<[
      { winnerId: string | null; choices: Record<string, string>; turnOrder?: string[] },
      { winnerId: string | null; choices: Record<string, string>; turnOrder?: string[] },
    ]>(
      [match.client1, match.client2],
      'rps_result',
      2000,
    );

    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });

    const [res1, res2] = await rpsPromise;
    expect(res1).toEqual(res2);
    expect(res1.winnerId).toBeNull();
  });
});
