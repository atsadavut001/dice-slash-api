import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { setupTwoPlayerMatch, disconnectMatchSockets, ActiveMatchFixture } from '../helpers/match-harness.helper';
import { waitForEvents } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Dice Rolling & Broadcast (E2E)', () => {
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

  it('T1.5.1: active player rolling dice generates 4 dice and broadcasts result to both players', async () => {
    match = await setupTwoPlayerMatch(context.url, MOCK_TOKEN_1, MOCK_TOKEN_2);

    const dicePromise = waitForEvents(
      [match.client1, match.client2],
      'dice_rolled',
      2000,
    );

    match.client1.emit('roll_dice', { roomId: match.roomId });

    const [p1Dice, p2Dice] = await dicePromise;
    expect(p1Dice.dice).toHaveLength(4);
    expect(p2Dice).toEqual(p1Dice);
  });
});
