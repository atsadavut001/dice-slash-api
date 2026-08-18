import { INestApplication } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { setupTestServer, teardownTestServer, TestServerContext } from '../helpers/test-server.setup';
import { createTestClient } from '../helpers/socket-client.helper';
import { MOCK_TOKEN_1, MOCK_USER_1 } from '../fixtures/mock-users.fixture';

describe('Tier 1: Socket Auth & Connection Verification (E2E)', () => {
  let context: TestServerContext;
  let client1: Socket;
  let clientGuest: Socket;

  beforeAll(async () => {
    context = await setupTestServer();
  });

  afterAll(async () => {
    if (client1?.connected) client1.disconnect();
    if (clientGuest?.connected) clientGuest.disconnect();
    await teardownTestServer(context.app);
  });

  it('T1.1.1: should connect successfully with valid JWT token', (done) => {
    client1 = createTestClient(context.url, MOCK_TOKEN_1);

    client1.on('connect', () => {
      expect(client1.connected).toBe(true);
      done();
    });

    client1.on('connect_error', (err) => {
      done(err);
    });
  });

  it('T1.1.2: should connect as guest when no token is provided', (done) => {
    clientGuest = createTestClient(context.url);

    clientGuest.on('connect', () => {
      expect(clientGuest.connected).toBe(true);
      done();
    });

    clientGuest.on('connect_error', (err) => {
      done(err);
    });
  });

  it('T1.1.3: should handle client disconnect gracefully without server crash', (done) => {
    const tempClient = createTestClient(context.url, MOCK_TOKEN_1);

    tempClient.on('connect', () => {
      expect(tempClient.connected).toBe(true);
      tempClient.disconnect();
      setTimeout(() => {
        expect(tempClient.connected).toBe(false);
        done();
      }, 100);
    });
  });
});
