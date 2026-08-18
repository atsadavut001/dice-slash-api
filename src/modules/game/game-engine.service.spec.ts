import { GameEngineService } from './game-engine.service';
import { CardState, MatchState } from './game-engine.types';

describe('GameEngineService', () => {
  let service: GameEngineService;

  beforeEach(() => {
    service = new GameEngineService();
  });

  describe('createDefaultDeck', () => {
    it('should create default character and 8 skill cards', () => {
      const { character, skills } = service.createDefaultDeck();
      expect(character).toBeDefined();
      expect(character.type).toBe('CHARACTER');
      expect(skills.length).toBe(8);
      expect(skills.every((s) => s.type === 'SKILL')).toBe(true);
    });
  });

  describe('initMatch', () => {
    it('should initialize a match in RPS_PHASE with starting hands of 3 cards', () => {
      const match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);

      expect(match.roomId).toBe('room_1');
      expect(match.status).toBe('RPS_PHASE');
      expect(match.turnNumber).toBe(0);
      expect(match.players['user_1'].hp).toBe(100);
      expect(match.players['user_1'].hand.length).toBe(3);
      expect(match.players['user_1'].deck.length).toBe(5);
      expect(match.players['user_2'].hp).toBe(100);
      expect(match.players['user_2'].hand.length).toBe(3);
      expect(match.players['user_2'].deck.length).toBe(5);
    });
  });

  describe('resolveRpsChoice', () => {
    let match: MatchState;

    beforeEach(() => {
      match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);
    });

    it('should throw error if match is not in RPS_PHASE', () => {
      match.status = 'MAIN_PHASE';
      expect(() => service.resolveRpsChoice(match, 'user_1', 'rock')).toThrow('Match is not in RPS_PHASE');
    });

    it('should handle single player choice and wait for second player', () => {
      const res = service.resolveRpsChoice(match, 'user_1', 'rock');
      expect(res.isTie).toBe(false);
      expect(res.winnerId).toBeNull();
      expect(match.status).toBe('RPS_PHASE');
    });

    it('should handle RPS tie by resetting choices and remaining in RPS_PHASE', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      const res = service.resolveRpsChoice(match, 'user_2', 'rock');

      expect(res.isTie).toBe(true);
      expect(res.winnerId).toBeNull();
      expect(match.status).toBe('RPS_PHASE');
      expect(Object.keys(match.rpsChoices).length).toBe(0);
    });

    it('should determine winner correctly (rock beats scissors) and transition to MAIN_PHASE', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      const res = service.resolveRpsChoice(match, 'user_2', 'scissors');

      expect(res.isTie).toBe(false);
      expect(res.winnerId).toBe('user_1');
      expect(res.loserId).toBe('user_2');
      expect(match.status).toBe('MAIN_PHASE');
      expect(match.firstPlayerId).toBe('user_1');
      expect(match.currentTurnPlayerId).toBe('user_1');
      expect(match.turnNumber).toBe(1);
    });

    it('should enforce P1 Turn 1 card draw skip rule', () => {
      const p1InitialHandSize = match.players['user_1'].hand.length;
      service.resolveRpsChoice(match, 'user_1', 'paper');
      service.resolveRpsChoice(match, 'user_2', 'rock');

      // Winner is user_1 (P1, Turn 1). P1 should NOT draw a card on Turn 1
      expect(match.turnNumber).toBe(1);
      expect(match.currentTurnPlayerId).toBe('user_1');
      expect(match.players['user_1'].hand.length).toBe(p1InitialHandSize);
    });
  });

  describe('rollDice', () => {
    let match: MatchState;

    beforeEach(() => {
      match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
    });

    it('should generate 3 element dice and 1 character die for active player', () => {
      const roll = service.rollDice(match, 'user_1');
      expect(roll.elements.length).toBe(3);
      expect(['fire', 'wave', 'leaf']).toContain(roll.elements[0]);
      expect(['slash', 'skill']).toContain(roll.character);
      expect(roll.allDice.length).toBe(4);
      expect(match.players['user_1'].hasRolledDiceThisTurn).toBe(true);
    });

    it('should throw error if non-turn player tries to roll', () => {
      expect(() => service.rollDice(match, 'user_2')).toThrow('Not your turn');
    });

    it('should throw error if player rolls twice in same turn', () => {
      service.rollDice(match, 'user_1');
      expect(() => service.rollDice(match, 'user_1')).toThrow('Dice already rolled this turn');
    });
  });

  describe('validateSkillCost', () => {
    it('should validate cost matching with element counts', () => {
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire'])).toBe(true);
      expect(service.validateSkillCost(['fire', 'fire', 'leaf'], ['fire', 'fire'])).toBe(true);
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire', 'fire'])).toBe(false);
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], [])).toBe(true);
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire', 'wave', 'leaf'])).toBe(true);
      expect(service.validateSkillCost(['fire', 'fire', 'fire'], ['fire', 'fire', 'fire'])).toBe(true);
      expect(service.validateSkillCost(['fire', 'fire'], ['fire', 'fire', 'fire'])).toBe(false);
    });
  });

  describe('playSkill & Miss Resolution', () => {
    let match: MatchState;

    beforeEach(() => {
      match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
    });

    it('should execute skill match and deal damage to opponent when cost is matched', () => {
      const skill = match.players['user_1'].hand[0];
      match.players['user_1'].diceRolled = {
        elements: ['fire', 'fire', 'wave'],
        character: 'slash',
        allDice: [],
      };
      match.players['user_1'].hasRolledDiceThisTurn = true;
      skill.cost = ['fire'];
      skill.damage = 25;
      skill.cooldown = 2;

      const action = service.playSkill(match, 'user_1', skill.id);

      expect(action.isMatch).toBe(true);
      expect(action.isMiss).toBe(false);
      expect(action.damage).toBe(25);
      expect(action.targetHp).toBe(75);
      expect(match.players['user_2'].hp).toBe(75);
      expect(match.players['user_1'].cooldownZone.length).toBe(1);
      expect(match.players['user_1'].cooldownZone[0].currentCooldown).toBe(2);
    });

    it('should cause Miss and 0 damage when cost is mismatched, but still move card to cooldown zone', () => {
      const skill = match.players['user_1'].hand[0];
      const initialHandCount = match.players['user_1'].hand.length;
      match.players['user_1'].diceRolled = {
        elements: ['leaf', 'leaf', 'leaf'],
        character: 'slash',
        allDice: [],
      };
      match.players['user_1'].hasRolledDiceThisTurn = true;
      skill.cost = ['fire', 'fire'];
      skill.damage = 40;
      skill.cooldown = 3;

      const action = service.playSkill(match, 'user_1', skill.id);

      expect(action.isMatch).toBe(false);
      expect(action.isMiss).toBe(true);
      expect(action.damage).toBe(0);
      expect(action.targetHp).toBe(100);
      expect(match.players['user_2'].hp).toBe(100);
      expect(match.players['user_1'].hand.length).toBe(initialHandCount - 1);
      expect(match.players['user_1'].cooldownZone.length).toBe(1);
      expect(match.players['user_1'].cooldownZone[0].card.id).toBe(skill.id);
      expect(match.players['user_1'].cooldownZone[0].currentCooldown).toBe(3);
      expect(match.players['user_1'].hasPlayedSkillThisTurn).toBe(true);
    });

    it('should declare GAME_OVER when opponent HP falls to 0', () => {
      const skill = match.players['user_1'].hand[0];
      match.players['user_1'].diceRolled = {
        elements: ['fire', 'fire', 'fire'],
        character: 'slash',
        allDice: [],
      };
      match.players['user_1'].hasRolledDiceThisTurn = true;
      skill.cost = ['fire'];
      skill.damage = 100;
      match.players['user_2'].hp = 50;

      const action = service.playSkill(match, 'user_1', skill.id);

      expect(action.isGameOver).toBe(true);
      expect(action.targetHp).toBe(0);
      expect(match.status).toBe('GAME_OVER');
      expect(match.winnerId).toBe('user_1');
      expect(match.loserId).toBe('user_2');
    });
  });

  describe('Cooldown Decrementing & Deck Rotation', () => {
    let match: MatchState;

    beforeEach(() => {
      match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
    });

    it('should decrement cooldown on turn start and return card to deck when cooldown reaches 0', () => {
      const cdCard: CardState = {
        id: 'cd_test',
        cardCode: 'CD_TEST',
        name: 'Test Cooldown Card',
        type: 'SKILL',
        cost: [],
        cooldown: 2,
        damage: 10,
      };

      // Put card in user_1's cooldown zone with cd = 2
      match.players['user_1'].cooldownZone.push({ card: cdCard, currentCooldown: 2 });

      // Turn 1: user_1 ends turn -> Turn 2 (user_2 turn)
      service.endTurn(match, 'user_1');
      expect(match.currentTurnPlayerId).toBe('user_2');
      // Cooldown for user_1 is NOT decremented on user_2's turn
      expect(match.players['user_1'].cooldownZone[0].currentCooldown).toBe(2);

      // Turn 2: user_2 rolls dice and ends turn -> Turn 3 (user_1 turn)
      service.rollDice(match, 'user_2');
      service.endTurn(match, 'user_2');
      expect(match.currentTurnPlayerId).toBe('user_1');

      // user_1's turn starts, cooldown decrements to 1
      expect(match.players['user_1'].cooldownZone.length).toBe(1);
      expect(match.players['user_1'].cooldownZone[0].currentCooldown).toBe(1);

      // Turn 3: user_1 rolls dice and ends turn -> Turn 4 (user_2 turn)
      service.rollDice(match, 'user_1');
      service.endTurn(match, 'user_1');

      // Turn 4: user_2 rolls dice and ends turn -> Turn 5 (user_1 turn)
      service.rollDice(match, 'user_2');
      service.endTurn(match, 'user_2');
      expect(match.currentTurnPlayerId).toBe('user_1');

      // user_1's turn starts, cooldown decrements to 0 -> card returned to deck
      expect(match.players['user_1'].cooldownZone.length).toBe(0);
      expect(match.players['user_1'].deck.some((c) => c.id === 'cd_test')).toBe(true);
    });

    it('should rotate returned card back into hand draw sequence when deck was empty', () => {
      // Empty user_2's deck
      match.players['user_2'].deck = [];
      const cdCard: CardState = {
        id: 'cd_rotate',
        cardCode: 'CD_ROTATE',
        name: 'Rotation Card',
        type: 'SKILL',
        cost: [],
        cooldown: 1,
        damage: 15,
      };
      match.players['user_2'].cooldownZone.push({ card: cdCard, currentCooldown: 1 });

      // user_1 ends turn -> Turn 2 (user_2 turn)
      service.endTurn(match, 'user_1');

      // user_2's cooldown reaches 0 -> card moves to deck -> drawn immediately into hand during Turn 2 draw phase
      expect(match.players['user_2'].cooldownZone.length).toBe(0);
      expect(match.players['user_2'].hand.some((c) => c.id === 'cd_rotate')).toBe(true);
    });
  });

  describe('Out-of-Phase Action Rejection', () => {
    let match: MatchState;

    beforeEach(() => {
      match = service.initMatch('room_1', 'normal', [
        { userId: 'user_1', socketId: 'sock_1' },
        { userId: 'user_2', socketId: 'sock_2' },
      ]);
    });

    it('should reject rollDice during RPS_PHASE', () => {
      expect(() => service.rollDice(match, 'user_1')).toThrow('Match is not in MAIN_PHASE');
    });

    it('should reject playSkill during RPS_PHASE', () => {
      expect(() => service.playSkill(match, 'user_1', 'sk_fire_1')).toThrow('Match is not in MAIN_PHASE');
    });

    it('should reject endTurn during RPS_PHASE', () => {
      expect(() => service.endTurn(match, 'user_1')).toThrow('Match is not in MAIN_PHASE');
    });

    it('should reject resolveRpsChoice during MAIN_PHASE', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      expect(match.status).toBe('MAIN_PHASE');
      expect(() => service.resolveRpsChoice(match, 'user_1', 'rock')).toThrow('Match is not in RPS_PHASE');
    });

    it('should reject rollDice when it is not player turn', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      // Turn is user_1
      expect(() => service.rollDice(match, 'user_2')).toThrow('Not your turn');
    });

    it('should reject playSkill when dice have not been rolled yet', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      const skillId = match.players['user_1'].hand[0].id;
      expect(() => service.playSkill(match, 'user_1', skillId)).toThrow('Must roll dice before playing a skill');
    });

    it('should reject playSkill when it is not player turn', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      const skillId = match.players['user_2'].hand[0].id;
      expect(() => service.playSkill(match, 'user_2', skillId)).toThrow('Not your turn');
    });

    it('should reject playSkill twice in the same turn', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      service.rollDice(match, 'user_1');
      const skill = match.players['user_1'].hand[0];
      skill.cost = []; // free cost

      service.playSkill(match, 'user_1', skill.id);
      expect(match.players['user_1'].hasPlayedSkillThisTurn).toBe(true);

      const skill2 = match.players['user_1'].hand[0];
      expect(() => service.playSkill(match, 'user_1', skill2.id)).toThrow('Already played a skill this turn');
    });

    it('should reject playSkill with a card not in player hand', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      service.rollDice(match, 'user_1');
      expect(() => service.playSkill(match, 'user_1', 'non_existent_skill_id')).toThrow('Skill not found in hand');
    });

    it('should reject actions after match status is GAME_OVER', () => {
      service.resolveRpsChoice(match, 'user_1', 'rock');
      service.resolveRpsChoice(match, 'user_2', 'scissors');
      service.rollDice(match, 'user_1');

      const skill = match.players['user_1'].hand[0];
      skill.cost = [];
      skill.damage = 100;
      match.players['user_2'].hp = 50;

      service.playSkill(match, 'user_1', skill.id);
      expect(match.status).toBe('GAME_OVER');

      expect(() => service.rollDice(match, 'user_1')).toThrow('Match is not in MAIN_PHASE');
      expect(() => service.playSkill(match, 'user_1', skill.id)).toThrow('Match is not in MAIN_PHASE');
      expect(() => service.endTurn(match, 'user_1')).toThrow('Match is not in MAIN_PHASE');
    });
  });
});

