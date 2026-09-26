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
