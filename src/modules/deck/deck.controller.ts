import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { DeckService } from './deck.service';
import { Deck } from '../../database/entities/deck.entity';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('decks')
@UseGuards(AuthGuard)
export class DeckController {
  constructor(private readonly deckService: DeckService) {}

  @Get()
  async findAll(@Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.deckService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.deckService.findOne(id, userId);
  }

  @Post()
  async create(@Body() createDeckDto: Partial<Deck>, @Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.deckService.create(createDeckDto, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDeckDto: Partial<Deck>, @Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.deckService.update(id, updateDeckDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.deckService.remove(id, userId);
  }
}
