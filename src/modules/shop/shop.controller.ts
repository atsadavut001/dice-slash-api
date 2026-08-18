import { Controller, Post, Get, Param, Req, UseGuards, HttpException, HttpStatus, Body } from '@nestjs/common';
import { ShopService } from './shop.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('packs')
  async getPacks() {
    return this.shopService.getActivePacks();
  }

  @Get('collection')
  @UseGuards(AuthGuard)
  async getCollection(@Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.shopService.getUserCollection(userId);
  }

  @Get('dices')
  @UseGuards(AuthGuard)
  async getDices(@Req() req) {
    const userId = req.user?.sub || req.user?.id || '00000000-0000-0000-0000-000000000000';
    return this.shopService.getAllDices(userId);
  }

  @Post('buy/:packId')
  @UseGuards(AuthGuard)
  async buyPack(@Param('packId') packId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.id;
    
    try {
      const result = await this.shopService.buyPack(userId, packId);
      return result;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Post('sell')
  @UseGuards(AuthGuard)
  async sellItem(@Req() req: any, @Body() body: { itemType: string, itemId: string }) {
    const userId = req.user.sub || req.user.id;
    try {
      const result = await this.shopService.sellItem(userId, body.itemType, body.itemId);
      return result;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
