import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Shirt, Sparkles, Trash2 } from 'lucide-react';
import { createSavedOutfit, deleteSavedOutfit, getSavedOutfits, type SavedOutfit } from '../services/api';

type Garment = {
  id_prendas: number;
  tipo: string;
  sub_tipo: string | null;
  foto: string;
  color: string;
};

type SavedOutfitsProps = {
  garments: Garment[];
  wardrobeLoading: boolean;
  wardrobeError: string | null;
  onOpenWardrobe: () => void;
  onRetryWardrobe: () => void;
};

export default function SavedOutfits({ garments, wardrobeLoading, wardrobeError, onOpenWardrobe, onRetryWardrobe }: SavedOutfitsProps) {
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadOutfits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOutfits(await getSavedOutfits());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar tus outfits guardados.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOutfits();
  }, [loadOutfits]);

  const toggleGarment = (garmentId: number) => {
    setSelectedGarmentIds(current => current.includes(garmentId)
      ? current.filter(id => id !== garmentId)
      : [...current, garmentId]);
  };

  const saveOutfit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingError(null);
    if (!selectedGarmentIds.length) {
      setSavingError('Seleccioná al menos una prenda para guardar el outfit.');
      return;
    }
    setIsSaving(true);
    try {
      await createSavedOutfit({ name: name.trim(), style: style.trim(), garmentIds: selectedGarmentIds });
      setName('');
      setStyle('');
      setSelectedGarmentIds([]);
      setIsCreating(false);
      await loadOutfits();
    } catch (saveError) {
      setSavingError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el outfit.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeOutfit = async (outfit: SavedOutfit) => {
    if (!window.confirm(`¿Querés eliminar “${outfit.name}”? Esta acción no se puede deshacer.`)) return;
    setDeletingId(outfit.id_outfit);
    setError(null);
    try {
      await deleteSavedOutfit(outfit.id_outfit);
      setOutfits(current => current.filter(item => item.id_outfit !== outfit.id_outfit));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el outfit.');
    } finally {
      setDeletingId(null);
    }
  };

  const showCreationForm = () => {
    setSavingError(null);
    setIsCreating(true);
  };

  return (
    <section className="wardrobe-page saved-outfits-page" aria-labelledby="saved-outfits-title">
      <div className="wardrobe-heading">
        <div>
          <span className="section-label">LOOKIA · TUS COMBINACIONES</span>
          <h2 className="font-headline" id="saved-outfits-title">Mis outfits</h2>
        </div>
        {!isCreating && <button type="button" className="btn-accent rounded-full px-5 py-3" onClick={showCreationForm}>
          <Sparkles size={17} aria-hidden="true" /> Crear outfit
        </button>}
      </div>

      {error && <div className="wardrobe-message wardrobe-message--error saved-outfits-error" role="alert">
        <span>{error}</span>
        <button type="button" className="btn-outline rounded-full px-4 py-2" onClick={() => void loadOutfits()}>Reintentar</button>
      </div>}

      {isCreating && <form className="saved-outfit-form panel" onSubmit={saveOutfit}>
        <div className="saved-outfit-form-heading">
          <div><span className="section-label">NUEVA COMBINACIÓN</span><h3 className="font-headline">Armá un outfit con tu ropero</h3></div>
          <p>Elegí las prendas que querés reunir. El outfit se guardará en tu cuenta.</p>
        </div>
        <div className="saved-outfit-details">
          <label className="wardrobe-field">Nombre del outfit
            <input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="Ej. Look para salir" />
          </label>
          <label className="wardrobe-field">Estilo u ocasión <span className="saved-outfit-optional">Opcional</span>
            <input maxLength={80} value={style} onChange={event => setStyle(event.target.value)} placeholder="Ej. Casual, oficina…" />
          </label>
        </div>
        <div className="saved-outfit-picker-heading">
          <div><h4>Prendas de tu ropero</h4><span>{selectedGarmentIds.length} seleccionadas</span></div>
        </div>
        {wardrobeError ? <div className="wardrobe-message wardrobe-message--error saved-outfits-error" role="alert">
          <span>{wardrobeError}</span><button type="button" className="btn-outline rounded-full px-4 py-2" onClick={onRetryWardrobe}>Reintentar</button>
        </div>
          : wardrobeLoading ? <div className="saved-outfit-picker-state" role="status">Cargando prendas…</div>
            : garments.length === 0 ? <div className="saved-outfit-picker-state">
              <Shirt size={22} aria-hidden="true" />
              <span>Necesitás agregar prendas antes de armar un outfit.</span>
              <button type="button" className="btn-outline rounded-full px-4 py-2" onClick={onOpenWardrobe}>Ir a Mi ropero</button>
            </div> : <div className="saved-outfit-picker">
              {garments.map(garment => {
                const selected = selectedGarmentIds.includes(garment.id_prendas);
                return <label key={garment.id_prendas} className={`saved-outfit-garment${selected ? ' saved-outfit-garment--selected' : ''}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleGarment(garment.id_prendas)} />
                  <img src={garment.foto} alt="" loading="lazy" />
                  <span className="saved-outfit-garment-copy"><strong>{garment.sub_tipo || garment.tipo}</strong><small>{garment.tipo} · {garment.color}</small></span>
                  <span className="saved-outfit-garment-check" aria-hidden="true"><Check size={15} /></span>
                </label>;
              })}
            </div>}
        {savingError && <p className="wardrobe-message wardrobe-message--error" role="alert">{savingError}</p>}
        <div className="saved-outfit-form-actions">
          <button type="submit" className="btn-accent rounded-full px-6 py-3" disabled={isSaving || wardrobeLoading || garments.length === 0}>
            <Check size={17} aria-hidden="true" /> {isSaving ? 'Guardando…' : 'Guardar outfit'}
          </button>
          <button type="button" className="btn-outline rounded-full px-6 py-3" disabled={isSaving} onClick={() => { setIsCreating(false); setSavingError(null); }}>Cancelar</button>
        </div>
      </form>}

      {isLoading ? <div className="saved-outfits-state panel" role="status">Cargando tus outfits…</div>
        : error ? null
        : outfits.length === 0 ? <div className="wardrobe-empty panel rounded-3xl saved-outfits-empty">
          <span className="wardrobe-empty-icon"><Sparkles size={28} /></span>
          <h3 className="font-headline">Todavía no guardaste outfits.</h3>
          <p className="text-muted">Combiná prendas de tu ropero y guardá tus looks para volver a consultarlos.</p>
          {!isCreating && <button type="button" className="btn-accent rounded-full px-5 py-3" onClick={showCreationForm}>Crear mi primer outfit</button>}
        </div> : <div className="saved-outfits-grid">
          {outfits.map(outfit => <article key={outfit.id_outfit} className="saved-outfit-card panel">
            <header className="saved-outfit-card-header">
              <div><h3 className="font-headline">{outfit.name}</h3>{outfit.style && <span className="saved-outfit-style">{outfit.style}</span>}</div>
              <button type="button" className="icon-button garment-delete" aria-label={`Eliminar outfit ${outfit.name}`} disabled={deletingId === outfit.id_outfit} onClick={() => void removeOutfit(outfit)}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="saved-outfit-date">Guardado el {new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(outfit.created_at))}</div>
            <div className="saved-outfit-items">
              {outfit.garments.map(garment => <div className="saved-outfit-item" key={garment.id_prendas}>
                <img src={garment.foto} alt={garment.sub_tipo || garment.tipo} loading="lazy" />
                <span><strong>{garment.sub_tipo || garment.tipo}</strong><small>{garment.tipo} · {garment.color}</small></span>
              </div>)}
              {outfit.garments.length === 0 && <p className="saved-outfit-no-items">Las prendas de este outfit ya no están disponibles en tu ropero.</p>}
            </div>
            <footer className="saved-outfit-card-footer">{outfit.garments.length} {outfit.garments.length === 1 ? 'prenda' : 'prendas'}</footer>
          </article>)}
        </div>}
    </section>
  );
}
