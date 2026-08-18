import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../database/entities/user.entity';
import { Card } from '../../database/entities/card.entity';
import { ShopPack } from '../../database/entities/shop-pack.entity';
import { PackSlot } from '../../database/entities/pack-slot.entity';
import { PackCard } from '../../database/entities/pack-card.entity';
import { PackDice } from '../../database/entities/pack-dice.entity';
import { Dice } from '../../database/entities/dice.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Card, ShopPack, PackSlot, PackCard, PackDice, Dice]),
    JwtModule.register({ secret: 'super-secret-dice-key' })
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
