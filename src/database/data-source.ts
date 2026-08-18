import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  username: 'postgres.hgwdzzwddbpcthojvsxm',
  password: '*Qx276p8d&qhMvH',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false, // Required for Supabase external connections
  },
  synchronize: false, // Must be false when using migrations
  logging: true,
  entities: ['src/database/entities/**/*.ts'],
  migrations: ['src/database/migrations/**/*.ts'],
});
