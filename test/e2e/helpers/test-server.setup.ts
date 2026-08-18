import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';

export interface TestServerContext {
  app: INestApplication;
  url: string;
  port: number;
}

export async function setupTestServer(): Promise<TestServerContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.listen(0);

  const address = app.getHttpServer().address();
  const port = typeof address === 'string' ? 3000 : address.port;
  const url = `http://localhost:${port}`;

  return { app, url, port };
}

export async function teardownTestServer(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}
