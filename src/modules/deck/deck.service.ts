import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deck } from '../../database/entities/deck.entity';

@Injectable()
export class DeckService {
  constructor(
    @InjectRepository(Deck)
    private deckRepository: Repository<Deck>,
  ) {}

  async findAll(userId: string): Promise<Deck[]> {
    return this.deckRepository.find({ where: { user_id: userId } });
  }

  async findOne(id: string, userId: string): Promise<Deck> {
    const deck = await this.deckRepository.findOne({ where: { id, user_id: userId } });
    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }
    return deck;
  }

  async create(createDeckDto: Partial<Deck>, userId: string): Promise<Deck> {
    if (createDeckDto.is_main) {
      await this.deckRepository.update(
        { user_id: userId },
        { is_main: false }
      );
    }
    const deck = this.deckRepository.create({
      ...createDeckDto,
      user_id: userId,
    });
    return this.deckRepository.save(deck);
  }

  async update(id: string, updateDeckDto: Partial<Deck>, userId: string): Promise<Deck> {
    const deck = await this.findOne(id, userId);
    if (updateDeckDto.is_main) {
      await this.deckRepository.update(
        { user_id: userId },
        { is_main: false }
      );
    }
    Object.assign(deck, updateDeckDto);
    return this.deckRepository.save(deck);
  }

  async remove(id: string, userId: string): Promise<void> {
    const deck = await this.findOne(id, userId);
    await this.deckRepository.remove(deck);
  }
}
