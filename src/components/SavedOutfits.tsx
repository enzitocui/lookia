import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, ChevronRight, Image as ImageIcon, Shirt, Sparkles, Trash2 } from 'lucide-react';
import { createSavedOutfit, deleteSavedOutfit, getSavedOutfit, getSavedOutfits, type SavedOutfit } from '../services/api';

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
  onOpenOutfit: (outfitId: number) => void;
};

export default function SavedOutfits({ garments, wardrobeLoading, wardrobeError, onOpenWardrobe, onRetryWardrobe, onOpenOutfit }: SavedOutfitsProps) {
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
  const saveInProgressRef = useRef(false);

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
    setSavingError(null);
    if (selectedGarmentIds.includes(garmentId)) {
      setSelectedGarmentIds(current => current.filter(id => id !== garmentId));
    } else if (selectedGarmentIds.length >= 4) {
      setSavingError('Un outfit puede incluir hasta cuatro prendas.');
    } else {
      setSelectedGarmentIds(current => [...current, garmentId]);
    }
  };

  const saveOutfit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingError(null);
    if (saveInProgressRef.current) return;
    if (!name.trim()) {
      setSavingError('Ingresá un nombre para el outfit.');
      return;
    }
    if (!selectedGarmentIds.length || selectedGarmentIds.length > 4) {
      setSavingError('Seleccioná entre una y cuatro prendas para guardar el outfit.');
      return;
    }
    saveInProgressRef.current = true;
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
      saveInProgressRef.current = false;
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
          <div><h4>Prendas de tu ropero</h4><span>{selectedGarmentIds.length}/4 seleccionadas</span></div>
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
              <div>
                <h3 className="font-headline"><button type="button" className="saved-outfit-open-title" onClick={() => onOpenOutfit(outfit.id_outfit)}>{outfit.name}<ChevronRight size={17} aria-hidden="true" /></button></h3>
                {outfit.style && <span className="saved-outfit-style">{outfit.style}</span>}
              </div>
              <button type="button" className="icon-button garment-delete" aria-label={`Eliminar outfit ${outfit.name}`} disabled={deletingId === outfit.id_outfit} onClick={() => void removeOutfit(outfit)}>
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </header>
            <button type="button" className="saved-outfit-open-preview" onClick={() => onOpenOutfit(outfit.id_outfit)} aria-label={`Abrir outfit ${outfit.name}`}>
              <span className="saved-outfit-date">Guardado el {new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(outfit.created_at))}</span>
              <span className="saved-outfit-items">
                {outfit.garments.map(garment => <span className="saved-outfit-item" key={garment.id_prendas}>
                  {garment.foto ? <img src={garment.foto} alt="" loading="lazy" /> : <span className="saved-outfit-image-placeholder"><ImageIcon size={18} aria-hidden="true" /></span>}
                  <span><strong>{garment.sub_tipo || garment.tipo}</strong><small>{garment.tipo} · {garment.color}</small></span>
                </span>)}
                {outfit.garments.length === 0 && <span className="saved-outfit-no-items">Las prendas de este outfit ya no están disponibles en tu ropero.</span>}
              </span>
              {outfit.evaluation && <span className="saved-outfit-evaluation-preview">{outfit.evaluation}</span>}
              <span className="saved-outfit-card-footer">{outfit.garments.length} {outfit.garments.length === 1 ? 'prenda' : 'prendas'} <span>Abrir outfit <ChevronRight size={15} aria-hidden="true" /></span></span>
            </button>
          </article>)}
        </div>}
    </section>
  );
}

export function SavedOutfitDetail({ outfitId, onBack }: { outfitId: number; onBack: () => void }) {
  const [outfit, setOutfit] = useState<SavedOutfit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOutfit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setOutfit(await getSavedOutfit(outfitId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el outfit.');
    } finally {
      setIsLoading(false);
    }
  }, [outfitId]);

  useEffect(() => {
    void loadOutfit();
  }, [loadOutfit]);

  if (isLoading) return <section className="wardrobe-page saved-outfit-detail-page"><div className="saved-outfits-state panel" role="status">Cargando el outfit…</div></section>;
  if (error || !outfit) return (
    <section className="wardrobe-page saved-outfit-detail-page" aria-labelledby="saved-outfit-detail-title">
      <button type="button" className="btn-outline rounded-full px-5 py-3 saved-outfit-back" onClick={onBack}><ArrowLeft size={17} /> Volver a Mis outfits</button>
      <div className="wardrobe-message wardrobe-message--error" role="alert">{error || 'No se encontró este outfit.'}</div>
      <button type="button" className="btn-outline rounded-full px-5 py-3" onClick={() => void loadOutfit()}>Reintentar</button>
    </section>
  );

  return (
    <section className="wardrobe-page saved-outfit-detail-page" aria-labelledby="saved-outfit-detail-title">
      <button type="button" className="btn-outline rounded-full px-5 py-3 saved-outfit-back" onClick={onBack}><ArrowLeft size={17} /> Volver a Mis outfits</button>
      <header className="saved-outfit-detail-heading">
        <span className="section-label">LOOKIA · MIS OUTFITS</span>
        <h2 className="font-headline" id="saved-outfit-detail-title">{outfit.name}</h2>
        {outfit.style && <p>{outfit.style}</p>}
      </header>
      <div className="saved-outfit-detail-grid">
        <section className="outfit-result-column panel" aria-labelledby="saved-outfit-garments-title">
          <h3 id="saved-outfit-garments-title"><Shirt size={19} aria-hidden="true" /> Prendas del outfit</h3>
          {outfit.garments.length
            ? <div className="outfit-garment-list">
              {outfit.garments.map(garment => <article className="outfit-garment-card" key={garment.id_prendas}>
                {garment.foto ? <img src={garment.foto} alt={garment.sub_tipo || garment.tipo} loading="lazy" /> : <div className="outfit-garment-image-placeholder"><ImageIcon size={25} aria-hidden="true" /></div>}
                <div><span>{garment.tipo}</span><h4>{garment.sub_tipo || garment.tipo}</h4><p>{garment.color}</p></div>
              </article>)}
            </div>
            : <p className="outfit-empty-wardrobe">Las prendas guardadas ya no están disponibles en tu ropero.</p>}
        </section>
        <section className="outfit-result-column outfit-explanation panel" aria-labelledby="saved-outfit-evaluation-title">
          <h3 id="saved-outfit-evaluation-title"><Sparkles size={19} aria-hidden="true" /> Evaluación del outfit</h3>
          {outfit.evaluation
            ? <p className="saved-outfit-detail-evaluation">{outfit.evaluation}</p>
            : <p className="saved-outfit-detail-no-evaluation">No se guardó una evaluación de IA para este outfit.</p>}
        </section>
      </div>
    </section>
  );
}
