import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 2: Out-of-Turn Action Rejection (E2E)', () => {
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

  it('T2.2.1: inactive player attempting to roll dice is rejected', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const errorPromise = waitForEvent<{ message: string }>(match.client2, 'error', 2000);
    match.client2.emit('roll_dice', { roomId: match.roomId });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toMatch(/turn/i);
  });

  it('T2.2.2: inactive player attempting to play skill is rejected', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const errorPromise = waitForEvent<{ message: string }>(match.client2, 'error', 2000);
    match.client2.emit('play_skill', {
      roomId: match.roomId,
      skillId: 'skill_fireball',
      diceUsed: ['fire', 'fire'],
    });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toMatch(/turn/i);
  });
});
