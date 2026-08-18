import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Rock-Paper-Scissors Flow (E2E)', () => {
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

  it('T1.3.1: RPS choice submission resolves winner and broadcasts turn order', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const rpsPromise = waitForEvents(
      [match.client1, match.client2],
      'rps_result',
      2000,
    );

    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'scissors' });

    const [res1, res2] = await rpsPromise;
    expect(res1.winnerId).toBeDefined();
    expect(res1.turnOrder).toHaveLength(2);
    expect(res2).toEqual(res1);
  });

  it('T1.3.2: RPS choice paper beats rock', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const rpsPromise = waitForEvents(
      [match.client1, match.client2],
      'rps_result',
      2000,
    );

    match.client1.emit('rps_choice', { roomId: match.roomId, choice: 'paper' });
    match.client2.emit('rps_choice', { roomId: match.roomId, choice: 'rock' });

    const [res1, res2] = await rpsPromise;
    expect(res1.choices).toBeDefined();
    expect(res1.winnerId).toBe('user_1');
    expect(res2).toEqual(res1);
  });
});
