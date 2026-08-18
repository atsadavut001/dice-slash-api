import { Controller, Post, Body, Param, UseGuards, Req, Get } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('game')
@UseGuards(AuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('queue')
  async joinQueue(@Req() req, @Body('mode') mode: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const match = await this.gameService.joinQueue(userId, '', mode || 'normal');
    return { success: true, match };
  }

  @Post('queue/leave')
  async leaveQueue(@Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    this.gameService.leaveQueue(userId);
    return { success: true };
  }

  @Get('queue/status')
  async queueStatus(@Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const match = await this.gameService.getMatchByUserId(userId);
    return { success: true, match };
  }

  @Post('custom/create')
  async createCustomRoom(@Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const roomId = await this.gameService.createCustomRoom(userId, '');
    return { success: true, roomId };
  }

  @Post('custom/join')
  async joinCustomRoom(@Req() req, @Body('roomId') roomId: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const match = await this.gameService.joinCustomRoom(roomId, userId, '');
    return { success: true, match };
  }

  @Get('match/:id')
  async getMatch(@Param('id') id: string) {
    const match = await this.gameService.getMatch(id);
    return { success: true, state: match };
  }

  @Post('match/:id/rps')
  async rps(@Param('id') id: string, @Req() req, @Body('choice') choice: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const result = await this.gameService.resolveRps(id, userId, choice);
    return { success: true, ...result };
  }

  @Post('match/:id/roll')
  async roll(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const result = await this.gameService.rollDice(id, userId);
    return { success: true, ...result };
  }

  @Post('match/:id/select-skill')
  async selectSkill(@Param('id') id: string, @Req() req, @Body('skillId') skillId: string | null) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const match = await this.gameService.selectSkill(id, userId, skillId);
    return { success: true, match };
  }

  @Post('match/:id/play-skill')
  async playSkill(@Param('id') id: string, @Req() req, @Body('skillId') skillId: string) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const result = await this.gameService.playSkill(id, userId, skillId);
    return { success: true, ...result };
  }

  @Post('match/:id/end-turn')
  async endTurn(@Param('id') id: string, @Req() req, @Body('isTimeout') isTimeout?: boolean) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const match = await this.gameService.endTurn(id, userId, !!isTimeout);
    return { success: true, match };
  }

  @Post('match/:id/surrender')
  async surrender(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const result = await this.gameService.surrenderMatch(id, userId);
    return { success: true, ...result };
  }
}
