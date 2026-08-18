import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { User } from '../../database/entities/user.entity';
import { ShopPack } from '../../database/entities/shop-pack.entity';
import { UserCharacter } from '../../database/entities/user-character.entity';
import { UserSkill } from '../../database/entities/user-skill.entity';

import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ShopPack, UserCharacter, UserSkill]),
    JwtModule.register({ secret: 'super-secret-dice-key' }),
  ],
  controllers: [ShopController],
  providers: [ShopService],
})
export class ShopModule {}
