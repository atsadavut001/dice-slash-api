import { Injectable } from '@nestjs/common';
import {
  MatchState,
  PlayerState,
  CardState,
  RpsChoice,
  RpsResult,
  DiceRollResult,
  ElementType,
  CharacterDieFace,
  DieResult,
  SkillActionResult,
} from './game-engine.types';

@Injectable()
export class GameEngineService {
  createDefaultDeck(): { character: CardState; skills: CardState[] } {
    const character: CardState = {
      id: 'char_default',
      cardCode: 'CHAR_DEFAULT',
      name: 'Default Hero',
      type: 'CHARACTER',
      cost: [],
      cooldown: 0,
      damage: 0,
    };

    const skills: CardState[] = [
      {
        id: 'sk_fire_1',
        cardCode: 'SK_FIRE_1',
        name: 'Fire Slash',
        type: 'SKILL',
        cost: ['fire'],
        cooldown: 2,
        damage: 20,
      },
      {
        id: 'sk_fire_2',
        cardCode: 'SK_FIRE_2',
        name: 'Flame Blast',
        type: 'SKILL',
        cost: ['fire', 'fire'],
        cooldown: 3,
        damage: 35,
      },
      {
        id: 'sk_wave_1',
        cardCode: 'SK_WAVE_1',
        name: 'Wave Cut',
        type: 'SKILL',
        cost: ['wave'],
        cooldown: 2,
        damage: 20,
      },
      {
        id: 'sk_wave_2',
        cardCode: 'SK_WAVE_2',
        name: 'Aqua Surge',
        type: 'SKILL',
        cost: ['wave', 'wave'],
        cooldown: 3,
        damage: 35,
      },
      {
        id: 'sk_leaf_1',
        cardCode: 'SK_LEAF_1',
        name: 'Leaf Blade',
        type: 'SKILL',
        cost: ['leaf'],
        cooldown: 2,
        damage: 20,
      },
      {
        id: 'sk_leaf_2',
        cardCode: 'SK_LEAF_2',
        name: 'Nature Strike',
        type: 'SKILL',
        cost: ['leaf', 'leaf'],
        cooldown: 3,
        damage: 35,
      },
      {
        id: 'sk_elem_1',
        cardCode: 'SK_ELEM_1',
        name: 'Elemental Burst',
        type: 'SKILL',
        cost: ['fire', 'wave', 'leaf'],
        cooldown: 4,
        damage: 50,
      },
      {
        id: 'sk_quick_1',
        cardCode: 'SK_QUICK_1',
        name: 'Quick Slash',
        type: 'SKILL',
        cost: [],
        cooldown: 1,
        damage: 15,
      },
    ];

    return { character, skills };
  }

  initMatch(
    roomId: string,
    mode: string,
    playerInfos: { userId: string; socketId: string; deck?: CardState[]; character?: CardState; elementDice?: string[][]; characterDie?: string[] }[],
  ): MatchState {
    const playersRecord: Record<string, PlayerState> = {};

    for (const info of playerInfos) {
      const defaultData = this.createDefaultDeck();
      const character = info.character || defaultData.character;
      const fullDeck = info.deck && info.deck.length > 0 ? [...info.deck] : [...defaultData.skills];

      const hand: CardState[] = [];
      const deck: CardState[] = [...fullDeck];

      // Shuffle deck using Fisher-Yates algorithm
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      const initialHandSize = Math.min(3, deck.length);

      for (let i = 0; i < initialHandSize; i++) {
        const drawn = deck.pop();
        if (drawn) {
          hand.push(drawn);
        }
      }

      playersRecord[info.userId] = {
        userId: info.userId,
        socketId: info.socketId,
        hp: 100,
        maxHp: 100,
        shield: 0,
        deck,
        hand,
        cooldownZone: [],
        character,
        diceRolled: null,
        selectedSkill: null,
        lastPlayedSkill: null,
        hasRolledDiceThisTurn: false,
        hasPlayedSkillThisTurn: false,
        elementDice: info.elementDice,
        characterDie: info.characterDie,
        minusElementDice: 0,
        blockedSkillTurns: 0,
      };
    }

    const match: MatchState = {
      roomId,
      mode,
      status: 'RPS_PHASE',
      turnNumber: 0,
      currentTurnPlayerId: null,
      firstPlayerId: null,
      secondPlayerId: null,
      rpsChoices: {},
      players: playersRecord,
      winnerId: null,
      loserId: null,
    };

    return match;
  }

  resolveRpsChoice(match: MatchState, playerId: string, choice: RpsChoice): RpsResult {
    if (match.status !== 'RPS_PHASE') {
      throw new Error('Match is not in RPS_PHASE');
    }
    if (!match.players[playerId]) {
      throw new Error(`Player ${playerId} is not in match ${match.roomId}`);
    }

    const validChoices: RpsChoice[] = ['rock', 'paper', 'scissors'];
    if (!validChoices.includes(choice)) {
      throw new Error('Invalid RPS choice');
    }

    match.rpsChoices[playerId] = choice;

    const playerIds = Object.keys(match.players);
    if (playerIds.length < 2) {
      return {
        choices: { ...match.rpsChoices },
        isTie: false,
        winnerId: null,
        loserId: null,
        turnOrder: [],
      };
    }

    const p1Id = playerIds[0];
    const p2Id = playerIds[1];

    // Check if both submitted
    if (match.rpsChoices[p1Id] && match.rpsChoices[p2Id]) {
      const c1 = match.rpsChoices[p1Id];
      const c2 = match.rpsChoices[p2Id];

      if (c1 === c2) {
        // Tie
        const result: RpsResult = {
          choices: { ...match.rpsChoices },
          isTie: true,
          winnerId: null,
          loserId: null,
          turnOrder: [],
        };
        match.rpsChoices = {};
        return result;
      }

      let winnerId: string;
      let loserId: string;

      if (
        (c1 === 'rock' && c2 === 'scissors') ||
        (c1 === 'scissors' && c2 === 'paper') ||
        (c1 === 'paper' && c2 === 'rock')
      ) {
        winnerId = p1Id;
        loserId = p2Id;
      } else {
        winnerId = p2Id;
        loserId = p1Id;
      }

      match.firstPlayerId = winnerId;
      match.secondPlayerId = loserId;
      match.currentTurnPlayerId = winnerId;
      match.turnNumber = 1;
      match.status = 'MAIN_PHASE';

      this.startTurnInternal(match, winnerId);

      return {
        choices: { ...match.rpsChoices },
        isTie: false,
        winnerId,
        loserId,
        turnOrder: [winnerId, loserId],
      };
    }

    return {
      choices: { ...match.rpsChoices },
      isTie: false,
      winnerId: null,
      loserId: null,
      turnOrder: [],
    };
  }

  rollDice(match: MatchState, playerId: string): DiceRollResult {
    if (match.status !== 'MAIN_PHASE') {
      throw new Error('Match is not in MAIN_PHASE');
    }
    if (match.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const player = match.players[playerId];
    if (!player) {
      throw new Error('Player not found in match');
    }
    if (player.hasRolledDiceThisTurn) {
      throw new Error('Dice already rolled this turn');
    }

    const fallbackElements: ElementType[] = ['fire', 'wave', 'leaf'];
    const fallbackCharacter: CharacterDieFace[] = ['slash', 'skill'];

    const getDieFace = (die?: string[], fallback?: string[]): any => {
      const faces = die && die.length > 0 ? die : fallback!;
      return faces[Math.floor(Math.random() * faces.length)];
    };

    const numDice = Math.max(0, 3 - (player.minusElementDice || 0));
    const elements: ElementType[] = [];
    for (let i = 0; i < numDice; i++) {
      elements.push(getDieFace(player.elementDice?.[i], fallbackElements));
    }
    player.minusElementDice = 0; // Reset after roll

    const character: CharacterDieFace = getDieFace(player.characterDie, fallbackCharacter);

    const allDice: DieResult[] = [
      ...elements.map((e) => ({ type: 'element' as const, value: e })),
      { type: 'character' as const, value: character },
    ];

    const result: DiceRollResult = {
      elements,
      character,
      allDice,
      characterAbilityTriggered: false,
    };

    player.diceRolled = result;
    player.hasRolledDiceThisTurn = true;

    // Process Character Abilities
    if (player.character && player.character.abilitiesJson && Array.isArray(player.character.abilitiesJson)) {
      const processCharEffect = (effect: any) => {
        if (effect.type === 'CONDITIONAL') {
          const cond = effect.condition;
          let condMet = false;
          if (cond && cond.check === 'CHARACTER_DICE') {
            const charValue = parseInt(character, 10);
            if (!isNaN(charValue)) {
              if (cond.operator === '==') condMet = charValue === cond.value;
              else if (cond.operator === '>') condMet = charValue > cond.value;
              else if (cond.operator === '<') condMet = charValue < cond.value;
              else if (cond.operator === '>=') condMet = charValue >= cond.value;
              else if (cond.operator === '<=') condMet = charValue <= cond.value;
            }
          }
          if (condMet && effect.effect) {
            result.characterAbilityTriggered = true;
            if (Array.isArray(effect.effect)) {
              effect.effect.forEach((e: any) => processCharEffect(e));
            } else {
              processCharEffect(effect.effect);
            }
          }
        } else if (effect.type === 'ADD_ELEMENT') {
          result.characterAbilityTriggered = true;
          let rawElement = (effect.element || 'WHITE').toLowerCase();
          const elementMap: Record<string, string> = {
            'red': 'fire', 'blue': 'wave', 'green': 'leaf',
            'yellow': 'light', 'purple': 'dark', 'cyan': 'wind',
            'indigo': 'wind', 'orange': 'thunder', 'gray': 'colorless'
          };
          const elementColor = elementMap[rawElement] || rawElement;
          const amount = effect.amount || 1;
          for (let i = 0; i < amount; i++) {
            player.diceRolled!.elements.push(elementColor);
            player.diceRolled!.allDice.push({ type: 'element', value: elementColor });
          }
        } else if (effect.type === 'HEAL') {
          result.characterAbilityTriggered = true;
          player.hp = Math.min(player.maxHp, player.hp + (effect.amount || 0));
        } else if (effect.type === 'SHIELD') {
          result.characterAbilityTriggered = true;
          player.shield += (effect.amount || 0);
        } else if (effect.type === 'DAMAGE') {
          result.characterAbilityTriggered = true;
          const opponentId = Object.keys(match.players).find(id => id !== playerId);
          if (opponentId) {
            const opponent = match.players[opponentId];
            let damage = effect.amount || 0;
            if (opponent.shield > 0) {
              if (opponent.shield >= damage) {
                opponent.shield -= damage;
                damage = 0;
              } else {
                damage -= opponent.shield;
                opponent.shield = 0;
              }
            }
            opponent.hp = Math.max(0, opponent.hp - damage);
            if (opponent.hp <= 0) {
              match.status = 'GAME_OVER';
              match.winnerId = playerId;
              match.loserId = opponentId;
            }
          }
        } else if (effect.type === 'MINUS_ELEMENT_DICE') {
          result.characterAbilityTriggered = true;
          const opponentId = Object.keys(match.players).find(id => id !== playerId);
          if (opponentId) {
             match.players[opponentId].minusElementDice = (match.players[opponentId].minusElementDice || 0) + (effect.amount || 0);
          }
        } else if (effect.type === 'TRUE_DAMAGE') {
          result.characterAbilityTriggered = true;
          const targetPlayerId = effect.target === 'SELF' ? playerId : Object.keys(match.players).find(id => id !== playerId);
          if (targetPlayerId) {
            const targetPlayer = match.players[targetPlayerId];
            targetPlayer.hp = Math.max(0, targetPlayer.hp - (effect.amount || 0));
            if (targetPlayer.hp <= 0) {
              match.status = 'GAME_OVER';
              match.winnerId = playerId === targetPlayerId ? Object.keys(match.players).find(id => id !== playerId)! : playerId;
              match.loserId = targetPlayerId;
            }
          }
        } else if (effect.type === 'REDUCE_COOLDOWN' || effect.type === 'INCREASE_COOLDOWN') {
          result.characterAbilityTriggered = true;
          const targetPlayerId = effect.target === 'SELF' ? playerId : Object.keys(match.players).find(id => id !== playerId);
          if (targetPlayerId) {
            const targetPlayer = match.players[targetPlayerId];
            if (targetPlayer.cooldownZone && targetPlayer.cooldownZone.length > 0) {
              const randomIndex = Math.floor(Math.random() * targetPlayer.cooldownZone.length);
              const cdItem = targetPlayer.cooldownZone[randomIndex];
              if (effect.type === 'REDUCE_COOLDOWN') {
                cdItem.currentCooldown -= (effect.amount || 1);
                if (cdItem.currentCooldown <= 0) {
                  targetPlayer.cooldownZone.splice(randomIndex, 1);
                  if (cdItem.returnToHand) {
                    targetPlayer.hand.push(cdItem.card);
                  } else {
                    targetPlayer.deck.unshift(cdItem.card);
                  }
                }
              } else {
                cdItem.currentCooldown += (effect.amount || 1);
              }
            }
          }
        } else if (effect.type === 'INCREASE_COST' || effect.type === 'REDUCE_COST') {
          result.characterAbilityTriggered = true;
          const targetPlayerId = effect.target === 'SELF' ? playerId : Object.keys(match.players).find(id => id !== playerId);
          if (targetPlayerId) {
            const targetPlayer = match.players[targetPlayerId];
            const mod = effect.type === 'INCREASE_COST' ? (effect.amount || 1) : -(effect.amount || 1);
            targetPlayer.costModifier = (targetPlayer.costModifier || 0) + mod;
          }
        } else if (effect.type === 'BLOCK_SKILL') {
          result.characterAbilityTriggered = true;
          const opponentId = Object.keys(match.players).find(id => id !== playerId);
          if (opponentId) {
             match.players[opponentId].blockedSkillTurns = (match.players[opponentId].blockedSkillTurns || 0) + (effect.amount || 1);
          }
        }
      };

      for (const effect of player.character.abilitiesJson) {
        processCharEffect(effect);
      }
    }

    match.lastAction = {
      type: 'DICE_ROLLED',
      payload: { playerId, dice: result },
      timestamp: Date.now(),
    };

    return result;
  }

  validateSkillCost(rolledElements: any[], requiredCost: ElementType[], costModifier: number = 0): boolean {
    if (!requiredCost || !Array.isArray(requiredCost)) return false;
    const elementsList = Array.isArray(rolledElements) ? rolledElements : [];

    const rolledCounts: Record<string, number> = {};
    for (const elem of elementsList) {
      if (typeof elem === 'string') {
        rolledCounts[elem.toLowerCase()] = (rolledCounts[elem.toLowerCase()] || 0) + 1;
      } else if (elem && typeof elem === 'object') {
        if (elem.slot1 && elem.slot1 !== 'NONE') {
          const s1 = elem.slot1.toLowerCase();
          rolledCounts[s1] = (rolledCounts[s1] || 0) + 1;
        }
        if (elem.slot2 && elem.slot2 !== 'NONE') {
          const s2 = elem.slot2.toLowerCase();
          rolledCounts[s2] = (rolledCounts[s2] || 0) + 1;
        }
      }
    }

    const costCounts: Record<string, number> = {};
    let whiteCount = 0;
    
    for (const elem of requiredCost) {
      const eLower = elem.toLowerCase();
      if (eLower === 'white' || eLower === 'any') {
        whiteCount++;
      } else {
        costCounts[eLower] = (costCounts[eLower] || 0) + 1;
      }
    }
    
    if (costModifier > 0) {
      whiteCount += costModifier;
    } else if (costModifier < 0) {
      let reduceAmount = -costModifier;
      if (whiteCount >= reduceAmount) {
        whiteCount -= reduceAmount;
        reduceAmount = 0;
      } else {
        reduceAmount -= whiteCount;
        whiteCount = 0;
      }
      
      if (reduceAmount > 0) {
        for (const elem of Object.keys(costCounts)) {
          if (costCounts[elem] >= reduceAmount) {
            costCounts[elem] -= reduceAmount;
            reduceAmount = 0;
            break;
          } else {
            reduceAmount -= costCounts[elem];
            costCounts[elem] = 0;
          }
        }
      }
    }

    for (const [elem, reqCount] of Object.entries(costCounts)) {
      if ((rolledCounts[elem] || 0) < reqCount) {
        return false;
      }
      rolledCounts[elem] -= reqCount;
    }

    let remainingElements = 0;
    for (const count of Object.values(rolledCounts)) {
      if (count > 0) {
        remainingElements += count;
      }
    }

    return remainingElements >= whiteCount;
  }

  selectSkill(match: MatchState, playerId: string, skillId: string | null): MatchState {
    const player = match.players[playerId];
    if (!player) return match;
    
    if (skillId === null) {
      player.selectedSkill = null;
    } else {
      const skillIndex = player.hand.findIndex((c) => c.id === skillId || c.cardCode === skillId);
      if (skillIndex !== -1) {
        player.selectedSkill = player.hand[skillIndex];
      }
    }
    return match;
  }

  playSkill(match: MatchState, playerId: string, skillId: string): SkillActionResult {
    if (match.status !== 'MAIN_PHASE') {
      throw new Error('Match is not in MAIN_PHASE');
    }
    if (match.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const player = match.players[playerId];
    if (!player) {
      throw new Error('Player not found in match');
    }
    if (!player.hasRolledDiceThisTurn || !player.diceRolled) {
      throw new Error('Must roll dice before playing a skill');
    }
    if (player.hasPlayedSkillThisTurn) {
      throw new Error('Already played a skill this turn');
    }
    if (player.blockedSkillTurns && player.blockedSkillTurns > 0) {
      throw new Error('You cannot play skills this turn (SILENCED).');
    }

    const skillIndex = player.hand.findIndex((c) => c.id === skillId || c.cardCode === skillId);
    if (skillIndex === -1) {
      throw new Error('Skill not found in hand');
    }

    const skillCard = player.hand[skillIndex];
    const opponentId = Object.keys(match.players).find((id) => id !== playerId);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }

    const opponent = match.players[opponentId];
    const isMatch = this.validateSkillCost(player.diceRolled.elements, skillCard.cost, player.costModifier || 0);
    const isMiss = !isMatch;
    
    let damage = 0;
    player.lastPlayedSkillReturnToHand = false;
    
    if (isMatch) {
      if (skillCard.abilitiesJson && Array.isArray(skillCard.abilitiesJson)) {
        const processEffect = (effect: any) => {
          let targetPlayer = effect.target === 'SELF' ? player : opponent;
          
          if (effect.type === 'CONDITIONAL') {
            const cond = effect.condition;
            let condMet = false;
            if (cond && cond.check === 'CHARACTER_DICE') {
              const charValue = parseInt(player.diceRolled!.character, 10);
              if (!isNaN(charValue)) {
                if (cond.operator === '==') condMet = charValue === cond.value;
                else if (cond.operator === '>') condMet = charValue > cond.value;
                else if (cond.operator === '<') condMet = charValue < cond.value;
                else if (cond.operator === '>=') condMet = charValue >= cond.value;
                else if (cond.operator === '<=') condMet = charValue <= cond.value;
              }
            }
            if (condMet && effect.effect) {
              if (Array.isArray(effect.effect)) {
                effect.effect.forEach((e: any) => processEffect(e));
              } else {
                processEffect(effect.effect);
              }
            }
          } else if (effect.type === 'DAMAGE') {
            // DMG applied directly inside damage accumulator for simplicity, assuming opponent target
            damage += effect.amount || 0;
          } else if (effect.type === 'HEAL') {
            targetPlayer.hp = Math.min(targetPlayer.maxHp, targetPlayer.hp + (effect.amount || 0));
          } else if (effect.type === 'SHIELD') {
            targetPlayer.shield += (effect.amount || 0);
          } else if (effect.type === 'MINUS_ELEMENT_DICE') {
            targetPlayer.minusElementDice = (targetPlayer.minusElementDice || 0) + (effect.amount || 0);
          } else if (effect.type === 'ADD_ELEMENT') {
            let rawElement = (effect.element || 'WHITE').toLowerCase();
            const elementMap: Record<string, string> = {
              'red': 'fire', 'blue': 'wave', 'green': 'leaf',
              'yellow': 'light', 'purple': 'dark', 'cyan': 'wind',
              'indigo': 'wind', 'orange': 'thunder', 'gray': 'colorless'
            };
            const elementColor = elementMap[rawElement] || rawElement;
            const amount = effect.amount || 1;
            for (let i = 0; i < amount; i++) {
              player.diceRolled!.elements.push(elementColor);
              player.diceRolled!.allDice.push({ type: 'element', value: elementColor });
            }
          } else if (effect.type === 'BLOCK_SKILL') {
            targetPlayer.blockedSkillTurns = (targetPlayer.blockedSkillTurns || 0) + (effect.amount || 1);
          } else if (effect.type === 'RETURN_TO_HAND') {
            player.lastPlayedSkillReturnToHand = true;
          } else if (effect.type === 'TRUE_DAMAGE') {
            targetPlayer.hp = Math.max(0, targetPlayer.hp - (effect.amount || 0));
          } else if (effect.type === 'REDUCE_COOLDOWN' || effect.type === 'INCREASE_COOLDOWN') {
            if (targetPlayer.cooldownZone && targetPlayer.cooldownZone.length > 0) {
              const randomIndex = Math.floor(Math.random() * targetPlayer.cooldownZone.length);
              const cdItem = targetPlayer.cooldownZone[randomIndex];
              if (effect.type === 'REDUCE_COOLDOWN') {
                cdItem.currentCooldown -= (effect.amount || 1);
                if (cdItem.currentCooldown <= 0) {
                  targetPlayer.cooldownZone.splice(randomIndex, 1);
                  if (cdItem.returnToHand) {
                    targetPlayer.hand.push(cdItem.card);
                  } else {
                    targetPlayer.deck.unshift(cdItem.card);
                  }
                }
              } else {
                cdItem.currentCooldown += (effect.amount || 1);
              }
            }
          } else if (effect.type === 'INCREASE_COST' || effect.type === 'REDUCE_COST') {
            const mod = effect.type === 'INCREASE_COST' ? (effect.amount || 1) : -(effect.amount || 1);
            targetPlayer.costModifier = (targetPlayer.costModifier || 0) + mod;
          }
        };

        for (const effect of skillCard.abilitiesJson) {
          processEffect(effect);
        }
      } else {
        // Fallback to legacy damage calculation
        damage = skillCard.damage;
      }
    }

    // Apply accumulated damage considering shield
    if (damage > 0) {
      if (opponent.shield > 0) {
        if (opponent.shield >= damage) {
          opponent.shield -= damage;
          damage = 0;
        } else {
          damage -= opponent.shield;
          opponent.shield = 0;
        }
      }
    }

    const targetHp = Math.max(0, opponent.hp - damage);
    opponent.hp = targetHp;

    // Remove skill from hand
    player.hand.splice(skillIndex, 1);

    player.hasPlayedSkillThisTurn = true;
    player.lastPlayedSkill = skillCard;

    const isGameOver = targetHp <= 0;
    if (isGameOver) {
      match.status = 'GAME_OVER';
      match.winnerId = playerId;
      match.loserId = opponent.userId;
    }

    const actionResult: SkillActionResult = {
      playerId,
      targetId: opponent.userId,
      skillId: skillCard.id || skillCard.cardCode,
      isMatch,
      isMiss,
      damage,
      targetHp,
      isGameOver,
      winnerId: match.winnerId,
    };

    match.lastAction = {
      type: 'SKILL_PLAYED',
      payload: actionResult,
      timestamp: Date.now(),
    };

    return actionResult;
  }

  endTurn(match: MatchState, playerId: string): MatchState {
    if (match.status !== 'MAIN_PHASE') {
      throw new Error('Match is not in MAIN_PHASE');
    }
    if (match.currentTurnPlayerId !== playerId) {
      throw new Error('Not your turn');
    }

    const opponentId = Object.keys(match.players).find((id) => id !== playerId);
    if (!opponentId) {
      throw new Error('Opponent not found');
    }

    const player = match.players[playerId];
    if (player.hasPlayedSkillThisTurn && player.lastPlayedSkill) {
      player.cooldownZone.push({
        card: player.lastPlayedSkill,
        currentCooldown: player.lastPlayedSkill.cooldown,
        returnToHand: player.lastPlayedSkillReturnToHand,
      });
      player.lastPlayedSkillReturnToHand = false;
    }

    if (player.blockedSkillTurns && player.blockedSkillTurns > 0) {
      player.blockedSkillTurns -= 1;
    }

    player.costModifier = 0;

    match.currentTurnPlayerId = opponentId;
    match.turnNumber += 1;

    this.startTurnInternal(match, opponentId);

    return match;
  }

  public startTurnInternal(match: MatchState, playerId: string): void {
    const player = match.players[playerId];
    if (!player) return;

    match.turnStartTime = Date.now();
    match.turnDuration = 90;

    // Reset turn flags
    player.hasRolledDiceThisTurn = false;
    player.hasPlayedSkillThisTurn = false;
    
    // Remove active effects
    player.diceRolled = null;
    player.selectedSkill = null;
    player.lastPlayedSkill = null;
    player.shield = 0; // Reset shield at start of own turn

    // Decrement cooldowns
    const remainingCooldownZone: typeof player.cooldownZone = [];
    for (const item of player.cooldownZone) {
      item.currentCooldown -= 1;
      if (item.currentCooldown <= 0) {
        if (item.returnToHand) {
          player.hand.push(item.card);
        } else {
          player.deck.unshift(item.card);
        }
      } else {
        remainingCooldownZone.push(item);
      }
    }
    player.cooldownZone = remainingCooldownZone;

    // P1 Turn 1 Rule: Skip card draw if turnNumber === 1 and playerId === firstPlayerId
    const isP1Turn1 = match.turnNumber === 1 && playerId === match.firstPlayerId;
    if (isP1Turn1) {
      // SKIP CARD DRAW
      return;
    }

    // Draw 1 card if available
    if (player.deck.length > 0) {
      const drawnCard = player.deck.pop();
      if (drawnCard) {
        player.hand.push(drawnCard);
      }
    }
  }
}
