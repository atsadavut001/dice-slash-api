import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('cards')
  getCards(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('type') type: string,
    @Query('rarity') rarity: string,
    @Query('color') color: string
  ) {
    return this.adminService.getAllCards(
      page ? parseInt(page) : 1, 
      limit ? parseInt(limit) : 20, 
      search, type, rarity, color
    );
  }

  @Get('cards/:id')
  getCard(@Param('id') id: string) {
    return this.adminService.getCardById(id);
  }

  @Post('cards')
  createCard(@Body() data: any) {
    return this.adminService.createCard(data);
  }

  @Put('cards/:id')
  updateCard(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateCard(id, data);
  }

  @Delete('cards/:id')
  deleteCard(@Param('id') id: string) {
    return this.adminService.deleteCard(id);
  }

  @Get('packs')
  getPacks(@Query('page') page: string, @Query('limit') limit: string, @Query('search') search: string) {
    return this.adminService.getAllPacks(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search);
  }

  @Get('packs/:id')
  getPack(@Param('id') id: string) {
    return this.adminService.getPackById(id);
  }

  @Post('packs')
  createPack(@Body() body: any) {
    return this.adminService.createPack(body.packData, body.slots, body.cards, body.dices);
  }

  @Put('packs/:id')
  updatePack(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updatePack(id, body.packData, body.slots, body.cards, body.dices);
  }

  @Delete('packs/:id')
  deletePack(@Param('id') id: string) {
    return this.adminService.deletePack(id);
  }

  @Get('users')
  getUsers(@Query('page') page: string, @Query('limit') limit: string, @Query('search') search: string) {
    return this.adminService.getAllUsers(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search);
  }

  @Get('dices')
  getDices(@Query('page') page: string, @Query('limit') limit: string, @Query('search') search: string) {
    return this.adminService.getAllDices(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search);
  }

  @Get('dices/:id')
  getDice(@Param('id') id: string) {
    return this.adminService.getDiceById(id);
  }

  @Post('dices')
  createDice(@Body() data: any) {
    return this.adminService.createDice(data);
  }

  @Put('dices/:id')
  updateDice(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateDice(id, data);
  }

  @Delete('dices/:id')
  deleteDice(@Param('id') id: string) {
    return this.adminService.deleteDice(id);
  }
}
