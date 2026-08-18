import { io, Socket } from 'socket.io-client';

export function createTestClient(url: string, token?: string): Socket {
  const authPayload = token
    ? { token: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
    : {};

  return io(url, {
    auth: authPayload,
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
}

export function waitForEvent<T = any>(
  socket: Socket,
  eventName: string,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, listener);
      reject(
        new Error(
          `[Timeout] Event "${eventName}" not received on socket ${socket.id} within ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);

    const listener = (data: T) => {
      clearTimeout(timer);
      resolve(data);
    };

    socket.once(eventName, listener);
  });
}

export function waitForEvents<T = any>(
  sockets: Socket[],
  eventName: string,
  timeoutMs = 5000,
): Promise<T[]> {
  return Promise.all(
    sockets.map((s) => waitForEvent<T>(s, eventName, timeoutMs)),
  );
}

export function emitAndListen<TResponse = any, TPayload = any>(
  socket: Socket,
  emitEvent: string,
  payload: TPayload,
  listenEvent: string,
  timeoutMs = 5000,
): Promise<TResponse> {
  const promise = waitForEvent<TResponse>(socket, listenEvent, timeoutMs);
  socket.emit(emitEvent, payload);
  return promise;
}
