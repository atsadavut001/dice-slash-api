export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type ElementType = 'fire' | 'wave' | 'leaf' | 'white' | string;
export type CharacterDieFace = 'slash' | 'skill';
export type GamePhase = 'RPS_PHASE' | 'TURN_START' | 'MAIN_PHASE' | 'GAME_OVER';

export interface ElementDieResult {
  type: 'element';
  value: ElementType;
}

export interface CharacterDieResult {
  type: 'character';
  value: CharacterDieFace;
}

export type DieResult = ElementDieResult | CharacterDieResult;

export interface DiceRollResult {
  elements: ElementType[];
  character: CharacterDieFace;
  allDice: DieResult[];
  characterAbilityTriggered?: boolean;
}

export interface CardState {
  id: string;
  cardCode: string;
  name: string;
  type: 'SKILL' | 'CHARACTER';
  cost: ElementType[];
  cooldown: number;
  damage: number;
  imageUrl?: string;
  hp?: number;
  colors?: string[];
  weakness?: string[];
  rarity?: string;
  description?: string;
  abilitiesJson?: any[];
}

export interface CooldownCardState {
  card: CardState;
  currentCooldown: number;
  returnToHand?: boolean;
}

export interface PlayerState {
  userId: string;
  socketId: string;
  hp: number;
  maxHp: number;
  shield: number;
  deck: CardState[];
  hand: CardState[];
  cooldownZone: CooldownCardState[];
  character: CardState | null;
  diceRolled: DiceRollResult | null;
  selectedSkill: CardState | null;
  lastPlayedSkill: CardState | null;
  hasRolledDiceThisTurn: boolean;
  hasPlayedSkillThisTurn: boolean;
  elementDice?: string[][];
  characterDie?: string[];
  minusElementDice?: number;
  blockedSkillTurns?: number;
  costModifier?: number;
  lastPlayedSkillReturnToHand?: boolean;
}

export interface MatchState {
  roomId: string;
  mode: string;
  status: GamePhase;
  turnNumber: number;
  currentTurnPlayerId: string | null;
  firstPlayerId: string | null;
  secondPlayerId: string | null;
  rpsChoices: Record<string, RpsChoice>;
  players: Record<string, PlayerState>;
  winnerId: string | null;
  loserId: string | null;
  turnStartTime?: number;
  turnDuration?: number;
  turnTimeoutCount?: Record<string, number>;
  lastAction?: {
    type: 'SKILL_PLAYED';
    payload: SkillActionResult;
    timestamp: number;
  } | {
    type: 'DICE_ROLLED';
    payload: { playerId: string; dice: DiceRollResult };
    timestamp: number;
  };
  gameOverResult?: {
    winnerGems: number;
    loserGems: number;
    scoreChange: number;
    hpDifference: number;
  };
}

export interface RpsResult {
  choices: Record<string, RpsChoice>;
  isTie: boolean;
  winnerId: string | null;
  loserId: string | null;
  turnOrder: string[];
}

export interface SkillActionResult {
  playerId: string;
  targetId: string;
  skillId: string;
  isMatch: boolean;
  isMiss: boolean;
  damage: number;
  targetHp: number;
  isGameOver: boolean;
  winnerId: string | null;
}
