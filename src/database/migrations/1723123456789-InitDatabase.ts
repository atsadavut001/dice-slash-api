import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class InitDatabase1723123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Users Table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'google_id', type: 'varchar', isUnique: true },
          { name: 'name', type: 'varchar', isNullable: true },
          { name: 'name_updated_at', type: 'timestamp', isNullable: true },
          { name: 'role', type: 'enum', enum: ['user', 'admin'], default: "'user'" },
          { name: 'rank_score', type: 'int', default: 100 },
          { name: 'gem', type: 'int', default: 1000 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // 2. Character Cards
    await queryRunner.createTable(
      new Table({
        name: 'character_cards',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'hp', type: 'int' },
          { name: 'colors', type: 'varchar', isArray: true }, // postgres array
          { name: 'rarity', type: 'varchar' },
          { name: 'ability_text', type: 'text' },
          { name: 'ability_logic', type: 'jsonb' },
          { name: 'weakness', type: 'varchar', isArray: true },
          { name: 'image', type: 'varchar' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // 3. Skill Cards
    await queryRunner.createTable(
      new Table({
        name: 'skill_cards',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'colors', type: 'varchar', isArray: true },
          { name: 'rarity', type: 'varchar' },
          { name: 'cost', type: 'jsonb' },
          { name: 'ability_text', type: 'text' },
          { name: 'ability_logic', type: 'jsonb' },
          { name: 'image', type: 'varchar' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // 4. Shop Packs
    await queryRunner.createTable(
      new Table({
        name: 'shop_packs',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'type', type: 'enum', enum: ['RANDOM', 'FIXED'] },
          { name: 'price', type: 'int' },
          { name: 'image', type: 'varchar' },
          { name: 'is_active', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    // 5. User Inventory (Characters & Skills)
    await queryRunner.createTable(
      new Table({
        name: 'user_characters',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'character_id', type: 'uuid' },
          { name: 'obtained_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createTable(
      new Table({
        name: 'user_skills',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'skill_id', type: 'uuid' },
          { name: 'obtained_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    // 6. Decks
    await queryRunner.createTable(
      new Table({
        name: 'decks',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'user_id', type: 'uuid' },
          { name: 'name', type: 'varchar' },
          { name: 'character_id', type: 'uuid', isNullable: true },
          { name: 'dice1_faces', type: 'varchar', isArray: true, isNullable: true },
          { name: 'dice2_faces', type: 'varchar', isArray: true, isNullable: true },
          { name: 'dice3_faces', type: 'varchar', isArray: true, isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
    
    // 7. Deck Skills (Relationship)
    await queryRunner.createTable(
      new Table({
        name: 'deck_skills',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'uuid_generate_v4()' },
          { name: 'deck_id', type: 'uuid' },
          { name: 'skill_id', type: 'uuid' },
          { name: 'slot_index', type: 'int' },
        ],
      }),
      true,
    );
    
    // Enable uuid-ossp extension for UUID generation
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deck_skills');
    await queryRunner.dropTable('decks');
    await queryRunner.dropTable('user_skills');
    await queryRunner.dropTable('user_characters');
    await queryRunner.dropTable('shop_packs');
    await queryRunner.dropTable('skill_cards');
    await queryRunner.dropTable('character_cards');
    await queryRunner.dropTable('users');
  }
}
