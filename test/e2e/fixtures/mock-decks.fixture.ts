export interface TestSkillCard {
  id: string;
  name: string;
  cost: string[]; // e.g. ['fire', 'fire'] or ['water', 'wind']
  damage: number;
  cooldown: number;
}

export interface TestDeck {
  id: string;
  characterId: string;
  skills: TestSkillCard[];
}

export const MOCK_SKILLS: Record<string, TestSkillCard> = {
  fireball: {
    id: 'skill_fireball',
    name: 'Fireball',
    cost: ['fire', 'fire'],
    damage: 25,
    cooldown: 2,
  },
  slash: {
    id: 'skill_slash',
    name: 'Slash',
    cost: ['physical'],
    damage: 15,
    cooldown: 1,
  },
  water_blast: {
    id: 'skill_water_blast',
    name: 'Water Blast',
    cost: ['water', 'wind'],
    damage: 20,
    cooldown: 2,
  },
  heal: {
    id: 'skill_heal',
    name: 'Heal',
    cost: ['light', 'light'],
    damage: 0,
    cooldown: 3,
  },
};

export const MOCK_DECK_1: TestDeck = {
  id: 'deck_1',
  characterId: 'char_warrior',
  skills: [
    MOCK_SKILLS.fireball,
    MOCK_SKILLS.slash,
    MOCK_SKILLS.water_blast,
    MOCK_SKILLS.slash,
    MOCK_SKILLS.fireball,
    MOCK_SKILLS.water_blast,
    MOCK_SKILLS.slash,
    MOCK_SKILLS.fireball,
  ],
};

export const MOCK_DECK_2: TestDeck = {
  id: 'deck_2',
  characterId: 'char_mage',
  skills: [
    MOCK_SKILLS.water_blast,
    MOCK_SKILLS.fireball,
    MOCK_SKILLS.slash,
    MOCK_SKILLS.water_blast,
    MOCK_SKILLS.fireball,
    MOCK_SKILLS.slash,
    MOCK_SKILLS.water_blast,
    MOCK_SKILLS.fireball,
  ],
};

export function canSatisfySkillCost(skillCost: string[], rolledDice: string[]): boolean {
  const available = [...rolledDice];
  for (const element of skillCost) {
    const index = available.indexOf(element);
    if (index === -1) {
      return false;
    }
    available.splice(index, 1);
  }
  return true;
}
