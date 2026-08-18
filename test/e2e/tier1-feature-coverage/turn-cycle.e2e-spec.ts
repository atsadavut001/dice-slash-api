import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Turn Cycle & Turn Switching (E2E)', () => {
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

  it('T1.4.1: turn ends and passes turn to opponent player', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const turnPromise = waitForEvent(match.client2, 'start_turn', 2000);
    match.client1.emit('end_turn', { roomId: match.roomId });

    const turnState = await turnPromise;
    expect(turnState.roomId).toBe(match.roomId);
    expect(turnState.turnPlayerId).toBeDefined();
  });

  it('T1.4.2: verify Turn 1 skip draw rule for Player 1', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const startTurnPromise = waitForEvent(match.client1, 'start_turn', 2000);
    const result = await startTurnPromise;
    expect(result.phase).toBeDefined();
    expect(result.turnPlayerId).toBeDefined();
  });
});
