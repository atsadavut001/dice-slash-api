import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameEngineService } from './game-engine.service';
import { JwtModule } from '@nestjs/jwt';
import { Deck } from '../../database/entities/deck.entity';
import { Card } from '../../database/entities/card.entity';
import { Dice } from '../../database/entities/dice.entity';
import { Match } from '../../database/entities/match.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtModule.register({ secret: 'super-secret-dice-key' }),
    TypeOrmModule.forFeature([Deck, Card, Dice, Match]),
    UsersModule,
  ],
  controllers: [GameController],
  providers: [GameService, GameEngineService],
  exports: [GameService, GameEngineService],
})
export class GameModule {}
