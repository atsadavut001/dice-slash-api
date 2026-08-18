import { Socket } from 'socket.io-client';
import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { createTestClient, waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1 } from '../fixtures/mock-users.fixture';

describe('Tier 2: Invalid Payload Handling (E2E)', () => {
  let context: TestServerContext;
  let client1: Socket;

  beforeAll(async () => {
    context = await setupTestServer();
  });

  afterAll(async () => {
    await teardownTestServer(context.app);
  });

  beforeEach(async () => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);
    await new Promise<void>((res) => client1.on('connect', res));
  });

  afterEach(() => {
    if (client1?.connected) client1.disconnect();
  });

  it('T2.1.1: joining custom room with invalid room ID receives error event', async () => {
    const errorPromise = waitForEvent<{ message: string }>(client1, 'error');
    client1.emit('join_custom', { roomId: 'INVALID_9999' });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toBe('Room not found or full');
  });

  it('T2.1.2: emitting malformed play_skill payload receives error event', async () => {
    const errorPromise = waitForEvent<{ message: string }>(client1, 'error', 2000);
    client1.emit('play_skill', { roomId: null, skillId: '', diceUsed: [] });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toBeDefined();
  });

  it('T2.1.3: emitting invalid rps choice receives error event', async () => {
    const errorPromise = waitForEvent<{ message: string }>(client1, 'error', 2000);
    client1.emit('rps_choice', { roomId: 'test_room', choice: 'lizard' });

    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toBeDefined();
  });
});
