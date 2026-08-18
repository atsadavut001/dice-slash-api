import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async googleLogin(reqUser: any) {
    if (!reqUser) return null;
    
    // Check if user exists
    let user = await this.userRepository.findOne({ where: { googleId: reqUser.googleId } });
    
    if (!user) {
      // Create new user with starting gems
      user = this.userRepository.create({
        googleId: reqUser.googleId,
        name: reqUser.name,
        gem: 1000,
        rankScore: 100,
        role: 'user',
      });
      await this.userRepository.save(user);
    }
    
    return user;
  }

  async getUserByGoogleId(googleId: string) {
    return this.userRepository.findOne({ where: { googleId } });
  }
}
