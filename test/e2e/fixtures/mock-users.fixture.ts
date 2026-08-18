import { JwtService } from '@nestjs/jwt';

const jwtService = new JwtService({ secret: 'super-secret-dice-key' });

export function generateTestToken(userId: string, email?: string): string {
  return jwtService.sign({
    sub: userId,
    id: userId,
    email: email || `${userId}@example.com`,
  });
}

export const MOCK_USER_1 = {
  id: 'user_1',
  name: 'Player One',
  email: 'player1@example.com',
  rankScore: 1000,
  gems: 500,
};

export const MOCK_USER_2 = {
  id: 'user_2',
  name: 'Player Two',
  email: 'player2@example.com',
  rankScore: 1000,
  gems: 500,
};

export const MOCK_TOKEN_1 = generateTestToken(MOCK_USER_1.id, MOCK_USER_1.email);
export const MOCK_TOKEN_2 = generateTestToken(MOCK_USER_2.id, MOCK_USER_2.email);
