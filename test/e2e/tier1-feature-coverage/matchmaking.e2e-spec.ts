import { Socket } from 'socket.io-client';
import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { createTestClient, waitForEvent } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_TOKEN_2 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Matchmaking Queue & Room Pairing (E2E)', () => {
  let context: TestServerContext;
  let client1: Socket;
  let client2: Socket;

  beforeAll(async () => {
    context = await setupTestServer();
  });

  afterAll(async () => {
    await teardownTestServer(context.app);
  });

  afterEach(() => {
    if (client1?.connected) client1.disconnect();
    if (client2?.connected) client2.disconnect();
  });

  it('T1.2.1: single player joining queue receives queue_joined event', async () => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);
    await new Promise<void>((res) => client1.on('connect', res));

    const queuePromise = waitForEvent<{ status: string }>(client1, 'queue_joined');
    client1.emit('join_queue', { mode: 'rank' });

    const res = await queuePromise;
    expect(res).toBeDefined();
    expect(res.status).toBe('waiting');
  });

  it('T1.2.2: two players queuing for same mode receive match_found with same roomId', async () => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);
    client2 = createTestClient(context.url, MOCK_TOKEN_2);

    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
    ]);

    const matchPromise1 = waitForEvent<{ roomId: string; mode: string }>(client1, 'match_found');
    const matchPromise2 = waitForEvent<{ roomId: string; mode: string }>(client2, 'match_found');

    client1.emit('join_queue', { mode: 'rank' });
    client2.emit('join_queue', { mode: 'rank' });

    const [match1, match2] = await Promise.all([matchPromise1, matchPromise2]);

    expect(match1.roomId).toBeDefined();
    expect(match1.mode).toBe('rank');
    expect(match2.roomId).toBe(match1.roomId);
  });

  it('T1.2.3: leaving queue emits queue_left confirmation', async () => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);
    await new Promise<void>((res) => client1.on('connect', res));

    client1.emit('join_queue', { mode: 'normal' });
    await waitForEvent(client1, 'queue_joined');

    const leavePromise = waitForEvent(client1, 'queue_left');
    client1.emit('leave_queue');

    await expect(leavePromise).resolves.toBeDefined();
  });

  it('T1.2.4: custom room creation and join by room code', async () => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);
    client2 = createTestClient(context.url, MOCK_TOKEN_2);

    await Promise.all([
      new Promise<void>((res) => client1.on('connect', res)),
      new Promise<void>((res) => client2.on('connect', res)),
    ]);

    const customCreatedPromise = waitForEvent<{ roomId: string }>(client1, 'custom_created');
    client1.emit('create_custom');

    const customRoom = await customCreatedPromise;
    expect(customRoom.roomId).toBeDefined();
    expect(customRoom.roomId.length).toBe(6);

    const matchPromise1 = waitForEvent<{ roomId: string }>(client1, 'match_found');
    const matchPromise2 = waitForEvent<{ roomId: string }>(client2, 'match_found');

    client2.emit('join_custom', { roomId: customRoom.roomId });

    const [m1, m2] = await Promise.all([matchPromise1, matchPromise2]);
    expect(m1.roomId).toBe(customRoom.roomId);
    expect(m2.roomId).toBe(customRoom.roomId);
  });
});
