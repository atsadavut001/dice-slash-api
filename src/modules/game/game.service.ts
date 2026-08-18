import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GameEngineService } from './game-engine.service';
import {
  MatchState,
  RpsChoice,
  RpsResult,
  DiceRollResult,
  SkillActionResult,
  CardState,
} from './game-engine.types';
import { Deck } from '../../database/entities/deck.entity';
import { Card } from '../../database/entities/card.entity';
import { Dice } from '../../database/entities/dice.entity';
import { Match } from '../../database/entities/match.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class GameService {
  private queue: { userId: string; socketId: string; mode: string }[] = [];
  private customRooms: Map<
    string,
    { roomId: string; host: { userId: string; socketId: string }; players: { userId: string; socketId: string }[] }
  > = new Map();

  constructor(
    private readonly gameEngineService: GameEngineService,
    private readonly usersService: UsersService,
    @InjectRepository(Deck) private deckRepo: Repository<Deck>,
    @InjectRepository(Card) private cardRepo: Repository<Card>,
    @InjectRepository(Dice) private diceRepo: Repository<Dice>,
    @InjectRepository(Match) private matchRepo: Repository<Match>,
  ) {}

  async loadPlayerDeck(userId: string): Promise<{ character: CardState | null; skills: CardState[]; elementDice?: string[][]; characterDie?: string[] }> {
    let deck = await this.deckRepo.findOne({ where: { user_id: userId, is_main: true } });
    if (!deck) {
      deck = await this.deckRepo.findOne({ where: { user_id: userId } });
    }

    if (!deck) {
      const defaultData = this.gameEngineService.createDefaultDeck();
      return { character: defaultData.character, skills: defaultData.skills };
    }

    let character: CardState | null = null;
    if (deck.character_id) {
      const charCard = await this.cardRepo.findOne({ where: { id: deck.character_id } });
      if (charCard) {
        character = {
          id: charCard.id,
          cardCode: charCard.cardCode || charCard.id,
          name: charCard.name,
          type: 'CHARACTER',
          cost: [],
          cooldown: 0,
          damage: 0,
          imageUrl: charCard.imageUrl,
          hp: charCard.hp || 100,
          colors: charCard.colors || [],
          weakness: charCard.weakness || [],
          rarity: charCard.rarity || 'C',
          description: charCard.abilitiesText || '',
          abilitiesJson: (typeof charCard.abilitiesJson === 'string' ? JSON.parse(charCard.abilitiesJson) : charCard.abilitiesJson) || [],
        };
      }
    }

    let skills: CardState[] = [];
    if (deck.skills && deck.skills.length > 0) {
      const skillIds = deck.skills.filter(s => s && s.trim() !== '');
      if (skillIds.length > 0) {
        const skillCards = await this.cardRepo.find({ where: { id: In(skillIds) } });
        skills = skillIds.map(sId => {
          const card = skillCards.find(c => c.id === sId);
          if (!card) return null;
          
          let costElements: string[] = [];
          if (card.cost && Array.isArray(card.cost)) {
            for (const c of card.cost) {
              if (typeof c === 'string') {
                costElements.push(c.toLowerCase());
              } else if (c.element && c.amount) {
                for (let i = 0; i < c.amount; i++) {
                  costElements.push(c.element.toLowerCase());
                }
              } else if (c.color && c.amount) {
                for (let i = 0; i < c.amount; i++) {
                  costElements.push(c.color.toLowerCase());
                }
              } else if (c.element) {
                costElements.push(c.element.toLowerCase());
              } else if (c.color) {
                costElements.push(c.color.toLowerCase());
              }
            }
          }

          costElements = costElements.map(e => {
            const mapping: Record<string, string> = {
              'red': 'fire', 'แดง': 'fire', 'fire': 'fire',
              'blue': 'wave', 'น้ำเงิน': 'wave', 'wave': 'wave',
              'green': 'leaf', 'เขียว': 'leaf', 'leaf': 'leaf',
              'yellow': 'light', 'เหลือง': 'light', 'light': 'light',
              'purple': 'dark', 'ม่วง': 'dark', 'dark': 'dark',
              'cyan': 'wind', 'ฟ้า': 'wind', 'wind': 'wind', 'indigo': 'wind',
              'orange': 'thunder', 'ส้ม': 'thunder', 'thunder': 'thunder',
              'gray': 'colorless', 'เทา': 'colorless', 'colorless': 'colorless',
            };
            return mapping[e.toLowerCase()] || e.toLowerCase();
          });

          let damage = 20;
          if (card.abilitiesJson) {
            if (typeof card.abilitiesJson === 'object') {
              if (card.abilitiesJson.damage) damage = card.abilitiesJson.damage;
              else if (card.abilitiesJson.effects) {
                const dmgEffect = card.abilitiesJson.effects.find((e: any) => e.type === 'damage' || e.damage);
                if (dmgEffect) damage = dmgEffect.damage || dmgEffect.value || 20;
              }
            }
          }

          let parsedAbilities = undefined;
          try {
            if (typeof card.abilitiesJson === 'string') {
              parsedAbilities = JSON.parse(card.abilitiesJson);
            } else if (card.abilitiesJson) {
              parsedAbilities = card.abilitiesJson;
            }
          } catch (e) {}

          return {
            id: card.id,
            cardCode: card.cardCode || card.id,
            name: card.name,
            type: 'SKILL' as const,
            cost: costElements,
            cooldown: card.cooldown || 2,
            damage,
            imageUrl: card.imageUrl,
            rarity: card.rarity || 'C',
            description: card.abilitiesText || `Deal ${damage} damage`,
            abilitiesJson: parsedAbilities,
          };
        }).filter(Boolean) as CardState[];
      }
    }

    if (skills.length === 0) {
      const defaultData = this.gameEngineService.createDefaultDeck();
      skills = defaultData.skills;
    }
    if (!character) {
      const defaultData = this.gameEngineService.createDefaultDeck();
      character = defaultData.character;
    }

    let elementDice: string[][] = [];
    let characterDie: string[] = [];
    
    const colorToElementMap: Record<string, string> = {
      RED: 'fire', BLUE: 'wave', GREEN: 'leaf', YELLOW: 'light',
      PURPLE: 'dark', CYAN: 'wind', INDIGO: 'wind', ORANGE: 'thunder', GRAY: 'colorless',
    };

    if (deck.element_dice && deck.element_dice.length > 0) {
      const diceEntities = await this.diceRepo.find({ where: { id: In(deck.element_dice.filter(Boolean)) } });
      elementDice = deck.element_dice.filter(Boolean).map(dId => {
        const d = diceEntities.find(e => e.id === dId);
        let faces = d && d.faces ? d.faces : ['fire', 'wave', 'leaf', 'fire', 'wave', 'leaf'];
        faces = faces.map((face: any) => {
          if (typeof face === 'object') {
            return {
              slot1: colorToElementMap[face.slot1] || face.slot1,
              slot2: colorToElementMap[face.slot2] || face.slot2,
            };
          }
          return colorToElementMap[face] || face;
        });
        return faces;
      });
    }

    if (deck.character_dice_id) {
      const charDie = await this.diceRepo.findOne({ where: { id: deck.character_dice_id } });
      if (charDie && charDie.faces && charDie.faces.length > 0) {
        characterDie = charDie.faces;
      } else {
        characterDie = ['1', '2', '3', '4', '5', '6'];
      }
    } else {
      characterDie = ['1', '2', '3', '4', '5', '6'];
    }

    return { character, skills, elementDice, characterDie } as any;
  }

  async joinQueue(userId: string, socketId: string, mode: string): Promise<MatchState | null> {
    const activeMatch = await this.getMatchByUserId(userId);
    if (activeMatch) {
      return activeMatch;
    }

    const existing = this.queue.find((q) => q.userId === userId);
    if (existing) {
      existing.socketId = socketId;
      existing.mode = mode;
    } else {
      this.queue.push({ userId, socketId, mode });
    }

    const candidates = this.queue.filter((q) => q.mode === mode && q.userId !== userId);
    if (candidates.length > 0) {
      const p1 = candidates[0];
      const p2 = this.queue.find((q) => q.userId === userId)!;

      this.queue = this.queue.filter((q) => q.userId !== p1.userId && q.userId !== p2.userId);

      const roomId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const [p1Deck, p2Deck] = await Promise.all([
        this.loadPlayerDeck(p1.userId),
        this.loadPlayerDeck(p2.userId),
      ]);

      const matchState = this.gameEngineService.initMatch(roomId, mode, [
        { userId: p1.userId, socketId: p1.socketId, deck: p1Deck.skills, character: p1Deck.character || undefined, elementDice: p1Deck.elementDice, characterDie: p1Deck.characterDie },
        { userId: p2.userId, socketId: p2.socketId, deck: p2Deck.skills, character: p2Deck.character || undefined, elementDice: p2Deck.elementDice, characterDie: p2Deck.characterDie },
      ]);

      for (const info of [p1, p2]) {
        const deckData = info.userId === p1.userId ? p1Deck : p2Deck;
        const charCard = deckData.character;
        if (charCard && matchState.players[info.userId]) {
          const dbChar = await this.cardRepo.findOne({ where: { id: charCard.id } });
          if (dbChar && dbChar.hp && dbChar.hp > 0) {
            matchState.players[info.userId].hp = dbChar.hp;
            matchState.players[info.userId].maxHp = dbChar.hp;
          }
        }
      }

      await this.saveMatch(roomId, mode, matchState.status, matchState);
      return matchState;
    }
    return null;
  }

  leaveQueue(userId: string): void {
    this.queue = this.queue.filter((q) => q.userId !== userId);
  }

  async createCustomRoom(userId: string, socketId: string): Promise<string> {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.customRooms.set(roomId, {
      roomId,
      host: { userId, socketId },
      players: [{ userId, socketId }],
    });
    return roomId;
  }

  async joinCustomRoom(roomId: string, userId: string, socketId: string): Promise<MatchState | null> {
    const room = this.customRooms.get(roomId);
    if (room && room.players.length === 1) {
      room.players.push({ userId, socketId });

      const [p1Deck, p2Deck] = await Promise.all([
        this.loadPlayerDeck(room.players[0].userId),
        this.loadPlayerDeck(room.players[1].userId),
      ]);

      const matchState = this.gameEngineService.initMatch(roomId, 'custom', [
        { userId: room.players[0].userId, socketId: room.players[0].socketId, deck: p1Deck.skills, character: p1Deck.character || undefined, elementDice: p1Deck.elementDice, characterDie: p1Deck.characterDie },
        { userId: room.players[1].userId, socketId: room.players[1].socketId, deck: p2Deck.skills, character: p2Deck.character || undefined, elementDice: p2Deck.elementDice, characterDie: p2Deck.characterDie },
      ]);

      for (const p of room.players) {
        const deckData = p.userId === room.players[0].userId ? p1Deck : p2Deck;
        const charCard = deckData.character;
        if (charCard && matchState.players[p.userId]) {
          const dbChar = await this.cardRepo.findOne({ where: { id: charCard.id } });
          if (dbChar && dbChar.hp && dbChar.hp > 0) {
            matchState.players[p.userId].hp = dbChar.hp;
            matchState.players[p.userId].maxHp = dbChar.hp;
          }
        }
      }

      await this.saveMatch(roomId, 'custom', matchState.status, matchState);
      this.customRooms.delete(roomId);
      return matchState;
    }
    return null;
  }

  async saveMatch(id: string, mode: string, status: string, state: MatchState) {
    if (status === 'GAME_OVER' && !state.gameOverResult && state.winnerId && state.loserId) {
      const winnerHp = state.players[state.winnerId]?.hp || 0;
      const loserHp = state.players[state.loserId]?.hp || 0;
      const hpDifference = Math.max(0, winnerHp - loserHp);
      
      try {
        const rewards = await this.persistRewards(state.winnerId, state.loserId, hpDifference, mode);
        state.gameOverResult = {
          winnerGems: rewards.winnerGems,
          loserGems: rewards.loserGems,
          scoreChange: rewards.scoreChange,
          hpDifference,
        };
      } catch (e) {
        state.gameOverResult = {
          winnerGems: 50,
          loserGems: 25,
          scoreChange: hpDifference,
          hpDifference,
        };
      }
    }

    let match = await this.matchRepo.findOne({ where: { id } });
    if (!match) {
      match = this.matchRepo.create({ id, mode, status, state });
    } else {
      match.status = status;
      match.state = state;
    }
    await this.matchRepo.save(match);
  }

  async getMatch(roomId: string): Promise<MatchState | undefined> {
    const match = await this.matchRepo.findOne({ where: { id: roomId } });
    return match?.state;
  }

  async getMatchByUserId(userId: string): Promise<MatchState | undefined> {
    const matches = await this.matchRepo.find({ where: { status: In(['WAITING', 'RPS_PHASE', 'PLAYING']) } });
    for (const match of matches) {
      if (match.state && match.state.players && match.state.players[userId]) {
        return match.state;
      }
    }
    return undefined;
  }

  async checkTurnTimeout(matchState: MatchState): Promise<boolean> {
    if ((matchState.status === 'MAIN_PHASE' || matchState.status === 'TURN_START') && matchState.turnStartTime) {
      const now = Date.now();
      const turnElapsed = (now - matchState.turnStartTime) / 1000;
      if (turnElapsed > 90) {
        if (matchState.currentTurnPlayerId) {
          this.gameEngineService.endTurn(matchState, matchState.currentTurnPlayerId);
        }
        return true;
      }
    }
    return false;
  }

  async resolveRps(roomId: string, userId: string, choice: RpsChoice): Promise<{ result: RpsResult; match: MatchState }> {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    const result = this.gameEngineService.resolveRpsChoice(match, userId, choice);
    await this.saveMatch(roomId, match.mode, match.status, match);
    return { result, match };
  }

  async rollDice(roomId: string, userId: string): Promise<{ roll: DiceRollResult; match: MatchState }> {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    
    if (await this.checkTurnTimeout(match)) {
      await this.saveMatch(roomId, match.mode, match.status, match);
      throw new Error('Turn timeout! Force ended turn.');
    }

    if (match.turnTimeoutCount && match.turnTimeoutCount[userId]) {
      match.turnTimeoutCount[userId] = 0;
    }

    const roll = this.gameEngineService.rollDice(match, userId);
    await this.saveMatch(roomId, match.mode, match.status, match);
    return { roll, match };
  }

  async selectSkill(roomId: string, userId: string, skillId: string | null): Promise<MatchState> {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    
    if (await this.checkTurnTimeout(match)) {
      await this.saveMatch(roomId, match.mode, match.status, match);
      throw new Error('Turn timeout! Force ended turn.');
    }

    if (match.turnTimeoutCount && match.turnTimeoutCount[userId]) {
      match.turnTimeoutCount[userId] = 0;
    }

    const updatedMatch = this.gameEngineService.selectSkill(match, userId, skillId);
    await this.saveMatch(roomId, match.mode, match.status, updatedMatch);
    return updatedMatch;
  }

  async playSkill(roomId: string, userId: string, skillId: string): Promise<{ actionResult: SkillActionResult; match: MatchState }> {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    
    if (await this.checkTurnTimeout(match)) {
      await this.saveMatch(roomId, match.mode, match.status, match);
      throw new Error('Turn timeout! Force ended turn.');
    }

    if (match.turnTimeoutCount && match.turnTimeoutCount[userId]) {
      match.turnTimeoutCount[userId] = 0;
    }

    const actionResult = this.gameEngineService.playSkill(match, userId, skillId);
    await this.saveMatch(roomId, match.mode, match.status, match);
    return { actionResult, match };
  }

  async endTurn(roomId: string, userId: string, isTimeout: boolean = false): Promise<MatchState> {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    
    if (isTimeout) {
      match.turnTimeoutCount = match.turnTimeoutCount || {};
      match.turnTimeoutCount[userId] = (match.turnTimeoutCount[userId] || 0) + 1;
    } else {
      if (match.turnTimeoutCount && match.turnTimeoutCount[userId]) {
        match.turnTimeoutCount[userId] = 0;
      }
    }

    const updatedMatch = this.gameEngineService.endTurn(match, userId);
    await this.saveMatch(roomId, match.mode, match.status, updatedMatch);
    return updatedMatch;
  }

  async surrenderMatch(roomId: string, surrenderingUserId: string) {
    const match = await this.getMatch(roomId);
    if (!match) throw new Error(`Match ${roomId} not found`);
    
    const winnerId = Object.keys(match.players).find(id => id !== surrenderingUserId);
    if (!winnerId) throw new Error('Opponent not found');
    
    match.status = 'GAME_OVER';
    match.winnerId = winnerId;
    match.loserId = surrenderingUserId;
    
    match.players[surrenderingUserId].hp = 0;
    
    await this.saveMatch(roomId, match.mode, match.status, match);
    return { winnerId, match, rewards: match.gameOverResult };
  }

  async removeMatch(roomId: string): Promise<void> {
    await this.matchRepo.delete(roomId);
  }

  async persistRewards(
    winnerId: string,
    loserId: string,
    hpDifference: number,
    mode: string,
  ): Promise<{ winnerGems: number; loserGems: number; scoreChange: number }> {
    return this.usersService.processPostGameRewards(winnerId, loserId, hpDifference, mode);
  }
}
