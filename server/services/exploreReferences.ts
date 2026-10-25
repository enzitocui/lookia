import { readFileSync } from 'node:fs';

export type ExploreReference = {
  id: number;
  category: string;
  gender: string;
  url: string;
  description: string;
};

const catalogPath = new URL('../../src/data/outfits.json', import.meta.url);
const parsedCatalog: unknown = JSON.parse(readFileSync(catalogPath, 'utf8'));

const isExploreReference = (value: unknown): value is ExploreReference => (
  Boolean(value)
  && typeof value === 'object'
  && 'id' in value && typeof value.id === 'number'
  && 'category' in value && typeof value.category === 'string'
  && 'gender' in value && typeof value.gender === 'string'
  && 'url' in value && typeof value.url === 'string' && /^https:\/\//i.test(value.url)
  && 'description' in value && typeof value.description === 'string'
);

if (!Array.isArray(parsedCatalog) || !parsedCatalog.every(isExploreReference)) {
  throw new Error('El catálogo de referencias de Explorar no tiene el formato esperado.');
}

const catalog = parsedCatalog as ExploreReference[];
const MAX_REFERENCE_IMAGES = 2;
const CATEGORY_ALIASES: Record<string, string[]> = {
  Boho: ['boho', 'bohemio', 'bohemia'],
  Y2K: ['y2k', 'dosmilero', 'dosmilera', 'años 2000'],
  'E-Girl': ['e-girl', 'egirl'],
  Gotico: ['gótico', 'gótica', 'gotico', 'gotica', 'dark'],
  Grunge: ['grunge'],
  Vintage: ['vintage', 'retro'],
  Deportivo: ['deportivo', 'deportiva', 'sport', 'entrenar', 'gimnasio'],
  Formal: ['formal', 'elegante', 'oficina', 'entrevista'],
  'Old Money': ['old money'],
  Cottagecore: ['cottagecore', 'campestre'],
  Coquette: ['coquette'],
  Casual: ['casual', 'informal', 'cotidiano', 'cotidiana', 'amigos', 'amigas'],
  Punk: ['punk'],
  Fairycore: ['fairycore'],
  Cosplay: ['cosplay', 'disfraz'],
};

const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

const containsPhrase = (text: string, phrase: string) => {
  const escaped = normalize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'u').test(text);
};

export const selectExploreReferences = (
  request: string,
  activeExploreCategory: string | undefined,
) => {
  const normalizedRequest = normalize(request);
  const categories = [...new Set(catalog.map(reference => reference.category))];
  const requestCategory = categories
    .flatMap(category => (CATEGORY_ALIASES[category] ?? [category])
      .filter(alias => containsPhrase(normalizedRequest, alias))
      .map(alias => ({ category, alias, position: normalizedRequest.indexOf(normalize(alias)) })))
    .sort((first, second) => first.position - second.position || second.alias.length - first.alias.length)[0]?.category;
  const selectedCategory = requestCategory
    ?? categories.find(category => normalize(category) === normalize(activeExploreCategory ?? ''))
    ?? (normalize(activeExploreCategory ?? '') === 'aura' ? null : categories[0]);

  if (!selectedCategory) return [];
  const candidates = catalog.filter(reference => reference.category === selectedCategory);
  if (!candidates.length) return [];

  const genderGroups = [...new Set(candidates.map(reference => reference.gender))];
  const balancedCandidates = genderGroups
    .map(gender => candidates.find(reference => reference.gender === gender))
    .filter((reference): reference is ExploreReference => Boolean(reference));
  return [...balancedCandidates, ...candidates]
    .filter((reference, index, list) => list.findIndex(candidate => candidate.id === reference.id) === index)
    .slice(0, MAX_REFERENCE_IMAGES);
};
