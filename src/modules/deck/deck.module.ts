import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeckController } from './deck.controller';
import { DeckService } from './deck.service';
import { Deck } from '../../database/entities/deck.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deck]),
    JwtModule.register({ secret: 'super-secret-dice-key' }),
  ],
  controllers: [DeckController],
  providers: [DeckService],
})
export class DeckModule {}
