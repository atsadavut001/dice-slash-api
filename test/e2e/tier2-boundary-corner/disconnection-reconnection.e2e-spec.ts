import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 2: Client Disconnection & Forfeit Handling (E2E)', () => {
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

  it('T2.5.1: player disconnecting during match notifies remaining player', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const disconnectNoticePromise = waitForEvent<{ playerId?: string; disconnectedPlayerId?: string }>(
      match.client2,
      'player_disconnected',
      2000,
    );

    match.client1.disconnect();

    const notice = await disconnectNoticePromise;
    expect(notice).toBeDefined();
  });
});
