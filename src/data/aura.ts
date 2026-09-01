export type AuraItem = {
  id: string;
  category: 'AURA';
  url: string;
  description: 'AURA Outfit';
};

const auraAssets = import.meta.glob<string>('../assets/aura/*.png', {
  eager: true,
  import: 'default',
  query: '?url'
});

export const auraItems: AuraItem[] = Object.entries(auraAssets)
  .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath))
  .map(([assetPath, url]) => {
    const fileName = assetPath.split('/').pop()?.replace(/\.png$/i, '') ?? assetPath;
    return {
      id: fileName,
      category: 'AURA',
      url,
      description: 'AURA Outfit'
    };
  });
