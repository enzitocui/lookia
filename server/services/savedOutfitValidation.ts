export type SavedOutfitInput = {
  name: string;
  style: string;
  evaluation: string | null;
  garmentIds: number[];
};

export type SavedOutfitInputResult =
  | { value: SavedOutfitInput; error?: never }
  | { value?: never; error: string };

export const validateSavedOutfitInput = (body: unknown): SavedOutfitInputResult => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Los datos del outfit no son válidos.' };
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const style = typeof input.style === 'string' ? input.style.trim() : '';
  const evaluation = input.evaluation == null
    ? null
    : typeof input.evaluation === 'string' ? input.evaluation.trim() : undefined;
  const rawGarmentIds: unknown = input.garmentIds;

  if (!name || name.length > 80) {
    return { error: 'El nombre del outfit es obligatorio y no puede superar 80 caracteres.' };
  }
  if (style.length > 80) return { error: 'El estilo no puede superar 80 caracteres.' };
  if (evaluation === undefined || (evaluation !== null && (!evaluation || evaluation.length > 2000))) {
    return { error: 'La evaluación del outfit no es válida.' };
  }
  if (!Array.isArray(rawGarmentIds) || rawGarmentIds.length === 0 || rawGarmentIds.length > 4) {
    return { error: 'Seleccioná entre una y cuatro prendas para el outfit.' };
  }
  const garmentIds = rawGarmentIds.filter((id: unknown): id is number => (
    typeof id === 'number' && Number.isSafeInteger(id) && id > 0
  ));
  if (garmentIds.length !== rawGarmentIds.length || new Set(garmentIds).size !== garmentIds.length) {
    return { error: 'La selección de prendas no es válida.' };
  }

  return {
    value: {
      name,
      style,
      evaluation,
      garmentIds,
    },
  };
};
