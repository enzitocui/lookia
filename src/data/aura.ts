export type AuraItem = {
  id: string;
  category: 'AURA';
  url: string;
  description: 'AURA Outfit';
};

export const auraItems: AuraItem[] = [1, 2, 3, 4].map(index => ({
  id: `aura_${index}`,
  category: 'AURA',
  url: `/aura/aura_${index}.jpg`,
  description: 'AURA Outfit'
}));
