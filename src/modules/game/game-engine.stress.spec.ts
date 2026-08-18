import { GameEngineService } from './game-engine.service';
import { CardState, MatchState } from './game-engine.types';

describe('GameEngineService - Stress & Edge Case Tests', () => {
  let service: GameEngineService;

  beforeEach(() => {
    service = new GameEngineService();
  });

  describe('1000 Simulated Dice Rolls', () => {
    it('should generate valid 3 element dice and 1 character die across 1000 rolls', () => {
      const match = service.initMatch('stress_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      const elementCounts: Record<string, number> = { fire: 0, wave: 0, leaf: 0 };
      const characterCounts: Record<string, number> = { slash: 0, skill: 0 };

      for (let i = 0; i < 1000; i++) {
        // Reset flag to allow re-rolling for simulation
        match.players['u1'].hasRolledDiceThisTurn = false;
        const roll = service.rollDice(match, 'u1');

        expect(roll.elements.length).toBe(3);
        expect(roll.allDice.length).toBe(4);

        for (const elem of roll.elements) {
          expect(['fire', 'wave', 'leaf']).toContain(elem);
          elementCounts[elem] = (elementCounts[elem] || 0) + 1;
        }

        expect(['slash', 'skill']).toContain(roll.character);
        characterCounts[roll.character] = (characterCounts[roll.character] || 0) + 1;
      }

      // Verify all faces appeared in 3000 element dice rolls (1000 * 3)
      expect(elementCounts.fire).toBeGreaterThan(0);
      expect(elementCounts.wave).toBeGreaterThan(0);
      expect(elementCounts.leaf).toBeGreaterThan(0);
      // Verify both character faces appeared in 1000 rolls
      expect(characterCounts.slash).toBeGreaterThan(0);
      expect(characterCounts.skill).toBeGreaterThan(0);
    });
  });

  describe('Duplicate Element Costs & Cost Matching', () => {
    it('should correctly handle single and duplicate element costs', () => {
      // 1. Single cost vs 1 matching element
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire'])).toBe(true);
      // 2. Duplicate cost vs 2 matching elements
      expect(service.validateSkillCost(['fire', 'fire', 'leaf'], ['fire', 'fire'])).toBe(true);
      // 3. Duplicate cost vs 1 matching element (FAIL)
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire', 'fire'])).toBe(false);
      // 4. Triple cost vs 3 matching elements
      expect(service.validateSkillCost(['fire', 'fire', 'fire'], ['fire', 'fire', 'fire'])).toBe(true);
      // 5. Triple element burst vs 3 different elements
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], ['fire', 'wave', 'leaf'])).toBe(true);
      // 6. Zero cost skill vs any rolled dice
      expect(service.validateSkillCost(['fire', 'wave', 'leaf'], [])).toBe(true);
    });
  });

  describe('Double Skill Play Vulnerability Check', () => {
    it('should expose if playing a 2nd skill in the same turn is prevented or allowed', () => {
      const match = service.initMatch('double_play_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      // Set dice roll
      match.players['u1'].diceRolled = {
        elements: ['fire', 'fire', 'wave'],
        character: 'slash',
        allDice: [],
      };
      match.players['u1'].hasRolledDiceThisTurn = true;

      const card1 = match.players['u1'].hand[0];
      const card2 = match.players['u1'].hand[1];

      // Play 1st skill
      service.playSkill(match, 'u1', card1.id);
      expect(match.players['u1'].hasPlayedSkillThisTurn).toBe(true);

      // Attempting to play 2nd skill in the same turn:
      // If the engine enforces 1 skill per turn, this should throw an error.
      // If it allows playing a 2nd skill, we capture the behavior.
      let errorThrown = false;
      try {
        service.playSkill(match, 'u1', card2.id);
      } catch (err: any) {
        errorThrown = true;
      }

      // DOCUMENTATION REQUIREMENT: record whether double play is prevented
      // Currently playSkill does NOT check hasPlayedSkillThisTurn!
      expect(errorThrown).toBe(true); // This test will FAIL if hasPlayedSkillThisTurn is not enforced!
    });
  });

  describe('Out-of-Phase RPS Choice Submission (State Corruption)', () => {
    it('should prevent RPS choice resolution during MAIN_PHASE', () => {
      const match = service.initMatch('phase_corruption_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      expect(match.status).toBe('MAIN_PHASE');
      expect(match.turnNumber).toBe(1);

      // Attempt to resolve RPS choice during MAIN_PHASE
      let errorThrown = false;
      try {
        service.resolveRpsChoice(match, 'u1', 'paper');
        service.resolveRpsChoice(match, 'u2', 'rock');
      } catch (err: any) {
        errorThrown = true;
      }

      // If resolveRpsChoice does not check match.status === 'RPS_PHASE',
      // it will corrupt match.turnNumber back to 1 and re-trigger turn transitions!
      expect(errorThrown).toBe(true);
      expect(match.status).toBe('MAIN_PHASE');
    });
  });

  describe('Negative HP Bounds & Clamping', () => {
    it('should clamp HP to 0 when damage exceeds current HP', () => {
      const match = service.initMatch('hp_bounds_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      match.players['u2'].hp = 15;
      match.players['u1'].diceRolled = {
        elements: ['fire', 'fire', 'fire'],
        character: 'slash',
        allDice: [],
      };
      match.players['u1'].hasRolledDiceThisTurn = true;

      const skill = match.players['u1'].hand[0];
      skill.cost = ['fire'];
      skill.damage = 50; // Deals 50 damage to player with 15 HP

      const result = service.playSkill(match, 'u1', skill.id);

      expect(result.targetHp).toBe(0);
      expect(match.players['u2'].hp).toBe(0);
      expect(result.isGameOver).toBe(true);
      expect(match.status).toBe('GAME_OVER');
      expect(match.winnerId).toBe('u1');
      expect(match.loserId).toBe('u2');
    });
  });

  describe('Deck Exhaustion', () => {
    it('should handle deck exhaustion without error when drawing cards', () => {
      const match = service.initMatch('deck_exhaust_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      // Empty u2's deck
      match.players['u2'].deck = [];

      // End u1's turn -> u2's turn starts (Turn 2)
      expect(() => service.endTurn(match, 'u1')).not.toThrow();
      expect(match.currentTurnPlayerId).toBe('u2');
      // Hand size remains unchanged since deck was empty
      expect(match.players['u2'].hand.length).toBe(3);
    });
  });

  describe('Cooldown Cycles & P1 Turn 1 Card Draw Skip', () => {
    it('should correctly skip P1 Turn 1 card draw and decrement cooldowns across multiple turns', () => {
      const match = service.initMatch('cooldown_room', 'normal', [
        { userId: 'u1', socketId: 's1' },
        { userId: 'u2', socketId: 's2' },
      ]);

      // Hand: 3, Deck: 5 initially
      expect(match.players['u1'].hand.length).toBe(3);
      expect(match.players['u1'].deck.length).toBe(5);

      // u1 wins RPS -> u1 is firstPlayerId, Turn 1 starts
      service.resolveRpsChoice(match, 'u1', 'rock');
      service.resolveRpsChoice(match, 'u2', 'scissors');

      // P1 Turn 1: hand length should STILL be 3 (card draw skipped for P1 on Turn 1)
      expect(match.players['u1'].hand.length).toBe(3);
      expect(match.players['u1'].deck.length).toBe(5);

      // u1 plays a skill with cooldown = 2
      match.players['u1'].diceRolled = {
        elements: ['fire', 'wave', 'leaf'],
        character: 'slash',
        allDice: [],
      };
      match.players['u1'].hasRolledDiceThisTurn = true;
      const card = match.players['u1'].hand[0];
      card.cost = [];
      card.cooldown = 2;

      service.playSkill(match, 'u1', card.id);
      expect(match.players['u1'].cooldownZone.length).toBe(1);
      expect(match.players['u1'].cooldownZone[0].currentCooldown).toBe(2);

      // Turn 1 ends -> Turn 2 (u2's turn). u2 draws card (hand size 3 -> 4)
      service.endTurn(match, 'u1');
      expect(match.turnNumber).toBe(2);
      expect(match.currentTurnPlayerId).toBe('u2');
      expect(match.players['u2'].hand.length).toBe(4);

      // Turn 2 ends -> Turn 3 (u1's turn). u1 cooldown decrements 2 -> 1, u1 draws card (hand size 2 -> 3)
      service.endTurn(match, 'u2');
      expect(match.turnNumber).toBe(3);
      expect(match.currentTurnPlayerId).toBe('u1');
      expect(match.players['u1'].cooldownZone[0].currentCooldown).toBe(1);
      expect(match.players['u1'].hand.length).toBe(3);

      // Turn 3 ends -> Turn 4 (u2's turn).
      service.endTurn(match, 'u1');
      expect(match.turnNumber).toBe(4);

      // Turn 4 ends -> Turn 5 (u1's turn). u1 cooldown decrements 1 -> 0 -> returns to deck!
      service.endTurn(match, 'u2');
      expect(match.turnNumber).toBe(5);
      expect(match.players['u1'].cooldownZone.length).toBe(0);
      // Card returned to deck
      expect(match.players['u1'].deck.some((c) => c.id === card.id)).toBe(true);
    });
  });
});
