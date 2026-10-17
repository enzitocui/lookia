import { ApifyClient } from 'apify-client';
import { config } from 'dotenv';
import { renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

config();

const ACTOR_ID = 'silentflow/pinterest-scraper-ppr';
const RESULTS_PER_GENDER = 30;
const GENDERS = ['men', 'women'];
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/outfits.json');
const categories = {
  Boho: 'boho outfit fashion',
  Y2K: 'Y2K outfit fashion',
  'E-Girl': 'e-girl outfit fashion',
  Gotico: 'gothic outfit fashion',
  Grunge: 'grunge outfit fashion',
  Vintage: 'vintage outfit fashion',
  Deportivo: 'sporty outfit fashion',
  Formal: 'formal outfit fashion',
  'Old Money': 'old money outfit fashion',
  Cottagecore: 'cottagecore outfit fashion',
  Coquette: 'coquette outfit fashion',
  Casual: 'casual outfit fashion',
  Punk: 'punk outfit fashion',
  Fairycore: 'fairycore outfit fashion',
  Cosplay: 'cosplay outfit fashion'
};

const isImageUrl = value => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  if (/pinterest\.(com|co\.uk|ca|de|fr|es)\//i.test(value) && !/i\.pinimg\.com/i.test(value)) return false;
  return /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(value) || /(?:i\.pinimg\.com|pinimg\.com)\//i.test(value);
};

const imageKeys = new Set([
  'image', 'imageurl', 'image_url', 'imageUrl', 'imageSrc', 'image_src',
  'thumbnail', 'thumbnailUrl', 'thumbnail_url', 'pinImage', 'pin_image', 'url'
]);

const findImageUrl = value => {
  if (isImageUrl(value)) return value;
  if (!value || typeof value !== 'object') return null;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (imageKeys.has(key) || /image|thumbnail|media|src/i.test(key)) {
      const found = findImageUrl(nestedValue);
      if (found) return found;
    }
  }
  for (const nestedValue of Object.values(value)) {
    const found = findImageUrl(nestedValue);
    if (found) return found;
  }
  return null;
};

const getImageKey = url => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    const filename = pathParts.at(-1)?.toLowerCase();
    const pinImageId = pathParts.at(-2)?.match(/^[a-f0-9]{32}$/i)?.[0]?.toLowerCase();
    return pinImageId || filename || `${parsedUrl.hostname}${parsedUrl.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

const run = async () => {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error('Falta configurar APIFY_API_TOKEN en .env');

  const client = new ApifyClient({ token });
  const collected = [];
  const usedImageKeys = new Set();
  const incomplete = [];

  for (const [category, query] of Object.entries(categories)) {
    for (const gender of GENDERS) {
      const genderItems = [];
      const search = `${query} ${gender}`;
      try {
        console.log(`Cargando ${category} ${gender} (${RESULTS_PER_GENDER} resultados): ${search}`);
        const { defaultDatasetId } = await client.actor(ACTOR_ID).call({
          search,
          maxItems: RESULTS_PER_GENDER
        });
        const { items } = await client.dataset(defaultDatasetId).listItems({ limit: RESULTS_PER_GENDER });
        for (const item of items.slice(0, RESULTS_PER_GENDER)) {
          const url = findImageUrl(item);
          const imageKey = url && getImageKey(url);
          if (!url || !imageKey || usedImageKeys.has(imageKey)) continue;
          usedImageKeys.add(imageKey);
          genderItems.push({
            id: `${category.toLowerCase().replace(/\s+/g, '-')}-${gender}-${genderItems.length + 1}`,
            category,
            gender,
            url,
            description: `${category} Outfit`
          });
        }
      } catch (error) {
        console.error(`${category} ${gender}: fallo el scraping. ${error instanceof Error ? error.message : error}`);
      }

      if (genderItems.length < RESULTS_PER_GENDER) {
        incomplete.push(`${category} ${gender}: ${genderItems.length}/${RESULTS_PER_GENDER}`);
        console.warn(`${category} ${gender}: solo se encontraron ${genderItems.length}/${RESULTS_PER_GENDER} imágenes válidas en los primeros ${RESULTS_PER_GENDER} resultados.`);
      }
      collected.push(...genderItems);
    }
  }

  if (!collected.length) {
    throw new Error('Apify no devolvió ninguna imagen; se conserva outfits.json sin cambios.');
  }

  const normalized = collected.map((item, index) => ({ ...item, id: index + 1 }));
  const temporaryPath = `${outputPath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  renameSync(temporaryPath, outputPath);
  console.log(`Listo: ${normalized.length} imágenes guardadas en ${outputPath}`);
  if (incomplete.length) {
    console.error(`Proceso incompleto (${incomplete.length} grupos): ${incomplete.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Verificación correcta: ${Object.keys(categories).length} categorías × 2 grupos × ${RESULTS_PER_GENDER} imágenes = ${normalized.length}.`);
  }
};

run().catch(error => {
  console.error(`No se pudo actualizar outfits.json: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
