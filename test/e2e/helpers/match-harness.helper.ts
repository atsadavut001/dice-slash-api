import { Socket } from 'socket.io-client';
import { createTestClient, waitForEvent } from './socket-client.helper';

export interface ActiveMatchFixture {
  client1: Socket;
  client2: Socket;
  roomId: string;
  mode: string;
}

export async function setupTwoPlayerMatch(
  serverUrl: string,
  token1?: string,
  token2?: string,
  mode = 'rank',
): Promise<ActiveMatchFixture> {
  const client1 = createTestClient(serverUrl, token1);
  const client2 = createTestClient(serverUrl, token2);

  await Promise.all([
    new Promise<void>((res) => client1.on('connect', res)),
    new Promise<void>((res) => client2.on('connect', res)),
  ]);

  const matchPromise1 = waitForEvent(client1, 'match_found');
  const matchPromise2 = waitForEvent(client2, 'match_found');

  client1.emit('join_queue', { mode });
  client2.emit('join_queue', { mode });

  const [match1, match2] = await Promise.all([matchPromise1, matchPromise2]);

  if (match1.roomId !== match2.roomId) {
    throw new Error(
      `Matchmaking failed: roomId mismatch (${match1.roomId} vs ${match2.roomId})`,
    );
  }

  return { client1, client2, roomId: match1.roomId, mode };
}

export async function disconnectMatchSockets(
  match: Partial<ActiveMatchFixture>,
): Promise<void> {
  if (match.client1?.connected) match.client1.disconnect();
  if (match.client2?.connected) match.client2.disconnect();
}
