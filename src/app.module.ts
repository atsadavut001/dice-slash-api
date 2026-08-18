import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ShopModule } from './modules/shop/shop.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { User } from './database/entities/user.entity';
import { ShopPack } from './database/entities/shop-pack.entity';
import { UserCharacter } from './database/entities/user-character.entity';
import { UserSkill } from './database/entities/user-skill.entity';
import { Card } from './database/entities/card.entity';
import { PackSlot } from './database/entities/pack-slot.entity';
import { PackCard } from './database/entities/pack-card.entity';
import { Dice } from './database/entities/dice.entity';
import { PackDice } from './database/entities/pack-dice.entity';
import { UserDice } from './database/entities/user-dice.entity';

import { PurchaseLog } from './database/entities/purchase-log.entity';
import { DeckModule } from './modules/deck/deck.module';
import { Deck } from './database/entities/deck.entity';
import { GameModule } from './modules/game/game.module';
import { Match } from './database/entities/match.entity';

import { UsersModule } from './modules/users/users.module';
import { StorageModule } from './modules/storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.dev', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        ssl: { rejectUnauthorized: false },
        entities: [User, ShopPack, UserCharacter, UserSkill, Card, PackSlot, PackCard, Dice, PackDice, UserDice, PurchaseLog, Deck, Match],
        synchronize: true,
      }),
    }),
    UsersModule,
    ShopModule,
    AuthModule,
    AdminModule,
    DeckModule,
    GameModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
