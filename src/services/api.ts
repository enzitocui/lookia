export type DatabaseValue = string | number | boolean | null;

export interface Prenda {
  id_prendas: number | string;
  tipo: DatabaseValue;
  sub_tipo: DatabaseValue;
  foto: DatabaseValue;
  color: DatabaseValue;
  id_users?: number | string;
}

export interface Tipo {
  id_tipo: number | string;
  tipo: string;
}

export interface SubTipo {
  id_subtipo: number | string;
  sub_tipo: string;
}

export interface User {
  id_users: number | string;
  nombre: string | null;
  apellido: string | null;
  username: string | null;
  photo: string | null;
  email: string | null;
  created_dt: string | null;
  update_dt: string | null;
  last_login: string | null;
  fecha_nacimiento: string | null;
  pais: string | null;
}

export interface SavedOutfitGarment {
  id_prendas: number;
  tipo: string;
  sub_tipo: string | null;
  foto: string;
  color: string;
}

export interface SavedOutfit {
  id_outfit: number;
  name: string;
  style: string | null;
  evaluation: string | null;
  created_at: string;
  garments: SavedOutfitGarment[];
}

export interface OutfitGarmentCard {
  id: number;
  name: string;
  category: string;
  color?: string;
  imageUrl: string;
}

export interface ExploreReferenceImage {
  id: number;
  category: string;
  gender: string;
  url: string;
  description: string;
}

export interface GeneratedOutfit {
  garments: OutfitGarmentCard[];
  referenceImages: ExploreReferenceImage[];
  referenceMessage?: string;
  evaluation: string | null;
  wardrobeMessage?: string;
}

async function getCollection<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`La solicitud a ${endpoint} falló (HTTP ${response.status}).`);
  }

  if (response.status === 204) {
    return [];
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`La respuesta de ${endpoint} no tiene el formato esperado.`);
  }

  return data as T[];
}

export const getPrendas = () => getCollection<Prenda>('/api/prendas');
export const getTipos = () => getCollection<Tipo>('/api/tipos');
export const getSubTipos = () => getCollection<SubTipo>('/api/sub-tipos');
export const getUsers = () => getCollection<User>('/api/users');

const requestOutfits = async <T,>(endpoint: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(endpoint, { credentials: 'include', ...init });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error
      : `La solicitud a ${endpoint} falló (HTTP ${response.status}).`;
    throw new Error(message);
  }
  return data as T;
};

export const getSavedOutfits = () => requestOutfits<SavedOutfit[]>('/api/outfits/saved');
export const getSavedOutfit = async (outfitId: number) => {
  const outfit = (await getSavedOutfits()).find(savedOutfit => savedOutfit.id_outfit === outfitId);
  if (!outfit) throw new Error('No se encontró este outfit guardado.');
  return outfit;
};
export const createSavedOutfit = (payload: { name: string; style: string; garmentIds: number[]; evaluation?: string }) => requestOutfits<{ id_outfit: number }>('/api/outfits/saved', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
export const generateOutfit = (payload: { request: string; previousGarmentIds: number[]; exploreCategory?: string }) => requestOutfits<GeneratedOutfit>('/api/outfits/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
export const deleteSavedOutfit = (outfitId: number) => requestOutfits<{ message: string }>(`/api/outfits/saved/${outfitId}`, {
  method: 'DELETE'
});
