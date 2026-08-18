import { Controller, Get, Query, Put, Body, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.usersService.getLeaderboard(isNaN(limit) ? 20 : limit);
  }

  @Put('me/name')
  @UseGuards(AuthGuard)
  async updateName(@Req() req: any, @Body('name') name: string) {
    return this.usersService.updateName(req.user.id, name);
  }

  @Get('me/history')
  @UseGuards(AuthGuard)
  async getMatchHistory(@Req() req: any) {
    return this.usersService.getMatchHistory(req.user.id);
  }
}
