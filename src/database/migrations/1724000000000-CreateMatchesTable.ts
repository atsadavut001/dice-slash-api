import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMatchesTable1724000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'matches',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'mode', type: 'varchar' },
          { name: 'status', type: 'varchar' },
          { name: 'state', type: 'jsonb' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    
    // Enable Supabase Realtime for the matches table
    await queryRunner.query(`ALTER PUBLICATION supabase_realtime ADD TABLE matches;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('matches');
  }
}
