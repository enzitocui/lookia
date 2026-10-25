import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Bookmark, Check, Image as ImageIcon, Lightbulb, LoaderCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import { createSavedOutfit, generateOutfit, type ExploreReferenceImage, type GeneratedOutfit, type OutfitGarmentCard } from '../services/api';

type OutfitBuilderProps = {
  exploreCategory: string;
  onOpenSavedOutfits: () => void;
};

export default function OutfitBuilder({ exploreCategory, onOpenSavedOutfits }: OutfitBuilderProps) {
  const [request, setRequest] = useState('');
  const [result, setResult] = useState<GeneratedOutfit | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveInProgressRef = useRef(false);

  const handleGenerate = async () => {
    if (!request.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const outfit = await generateOutfit({
        request: request.trim(),
        previousGarmentIds: result?.garments.map(garment => garment.id) ?? [],
        exploreCategory,
      });
      setResult(outfit);
      setIsPreviewOpen(true);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'No se pudo generar el outfit.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleGenerate();
  };

  const saveOutfit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = saveName.trim();
    if (!result?.garments.length || !result.evaluation || saveInProgressRef.current) return;
    if (!normalizedName) {
      setSaveError('Ingresá un nombre para el outfit.');
      return;
    }
    saveInProgressRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await createSavedOutfit({
        name: normalizedName,
        style: request.trim().slice(0, 80),
        garmentIds: result.garments.map(garment => garment.id),
        evaluation: result.evaluation,
      });
      setSaveSuccess(true);
      setIsSaveDialogOpen(false);
      setSaveName('');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el outfit.');
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  };

  const closePreview = useCallback(() => setIsPreviewOpen(false), []);

  return (
    <section className="outfit-builder" aria-labelledby="outfit-page-title">
      <div className="outfit-builder-heading">
        <span className="section-label">LOOKIA · TU ESTILO, A TU MANERA</span>
        <h2 id="outfit-page-title" className="font-headline">Creá tu outfit</h2>
        <p>Describí lo que buscás y LOOKIA combinará prendas reales de tu ropero.</p>
      </div>

      <form className="outfit-request panel" onSubmit={handleSubmit}>
        <label className="outfit-request-label" htmlFor="outfit-request">
          ¿Qué tenés en mente?
        </label>
        <textarea
          id="outfit-request"
          value={request}
          maxLength={1000}
          onChange={event => setRequest(event.target.value)}
          placeholder="Ejemplo: Quiero un outfit casual para salir con amigos, cómodo, con colores oscuros y sin usar campera."
          rows={6}
          required
        />
        <div className="outfit-request-footer">
          <p>Podés contar la ocasión, el estilo, los colores y las prendas que preferís o querés evitar.</p>
          <button type="submit" className="btn-accent rounded-full px-6 py-3" disabled={!request.trim() || isGenerating}>
            {isGenerating
              ? <LoaderCircle size={18} aria-hidden="true" className="outfit-generating-icon" />
              : <Sparkles size={18} aria-hidden="true" />}
            {isGenerating ? 'Generando…' : result ? 'Generar outfit' : 'Generar outfit'}
          </button>
        </div>
      </form>

      {generationError && <p className="outfit-feedback-error" role="alert">{generationError}</p>}
      {isPreviewOpen && result && (
        <OutfitResultView
          result={result}
          isGenerating={isGenerating}
          generationError={generationError}
          isSaveDialogOpen={isSaveDialogOpen}
          isSaving={isSaving}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onClose={closePreview}
          onGenerateAgain={() => void handleGenerate()}
          onOpenSaveDialog={() => {
            setSaveError(null);
            setSaveName('');
            setIsSaveDialogOpen(true);
          }}
          onCloseSaveDialog={() => {
            if (!isSaving) {
              setIsSaveDialogOpen(false);
              setSaveError(null);
            }
          }}
          onSave={saveOutfit}
          saveName={saveName}
          onSaveNameChange={setSaveName}
          onOpenSavedOutfits={onOpenSavedOutfits}
        />
      )}
    </section>
  );
}

function OutfitResultView({
  result,
  isGenerating,
  generationError,
  isSaveDialogOpen,
  isSaving,
  saveError,
  saveSuccess,
  onClose,
  onGenerateAgain,
  onOpenSaveDialog,
  onCloseSaveDialog,
  onSave,
  saveName,
  onSaveNameChange,
  onOpenSavedOutfits,
}: {
  result: GeneratedOutfit;
  isGenerating: boolean;
  generationError: string | null;
  isSaveDialogOpen: boolean;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onClose: () => void;
  onGenerateAgain: () => void;
  onOpenSaveDialog: () => void;
  onCloseSaveDialog: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saveName: string;
  onSaveNameChange: (value: string) => void;
  onOpenSavedOutfits: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaveDialogOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSaveDialogOpen, onClose]);

  return (
    <div className="outfit-preview-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="outfit-preview-modal" role="dialog" aria-modal="true" aria-labelledby="outfit-result-title" tabIndex={-1} ref={dialogRef}>
        <header className="outfit-preview-header">
          <div>
            <span className="section-label">LOOKIA · TU ROPERO</span>
            <h3 id="outfit-result-title" className="font-headline">Tu propuesta de outfit</h3>
            <p>Prendas seleccionadas según tu solicitud.</p>
          </div>
          <button type="button" className="icon-button outfit-preview-close" aria-label="Cerrar ventana" onClick={onClose}><X size={22} /></button>
        </header>

        <div className="outfit-result-grid">
          <GarmentSection title="Prendas seleccionadas" garments={result.garments} emptyMessage={result.wardrobeMessage || 'No se encontraron prendas compatibles.'} className="outfit-result-garments" />
          <ExploreReferencesSection
            references={result.referenceImages}
            complementaryItems={result.complementaryItems}
            emptyMessage={result.referenceMessage}
          />
          <OutfitEvaluation evaluation={result.evaluation} wardrobeMessage={result.wardrobeMessage} />
        </div>

        {generationError && <p className="outfit-feedback-error" role="alert">{generationError}</p>}
        <div className="outfit-result-actions">
          {result.garments.length > 0 && result.evaluation && <button type="button" className="btn-accent rounded-full px-5 py-3" onClick={onOpenSaveDialog} disabled={isSaving}>
            <Bookmark size={17} aria-hidden="true" /> Guardar outfit
          </button>}
          <button type="button" className="btn-outline rounded-full px-5 py-3" onClick={onGenerateAgain} disabled={isGenerating}>
            {isGenerating ? <LoaderCircle size={17} aria-hidden="true" className="outfit-generating-icon" /> : <RefreshCw size={17} aria-hidden="true" />}
            {isGenerating ? 'Generando…' : 'Otra combinación'}
          </button>
          {saveSuccess && <span className="outfit-request-notice" role="status">Outfit guardado en tu cuenta.</span>}
          {saveError && <span className="outfit-feedback-error" role="alert">{saveError}</span>}
          {saveSuccess && <button type="button" className="btn-outline rounded-full px-5 py-3" onClick={onOpenSavedOutfits}>Ver Mis outfits</button>}
        </div>
        {isSaveDialogOpen && <SaveOutfitDialog
          name={saveName}
          isSaving={isSaving}
          error={saveError}
          onNameChange={onSaveNameChange}
          onCancel={onCloseSaveDialog}
          onSubmit={onSave}
        />}
      </section>
    </div>
  );
}

function GarmentSection({ title, garments, emptyMessage, className }: { title: string; garments: OutfitGarmentCard[]; emptyMessage: string; className?: string }) {
  return (
    <section className={`outfit-result-column panel ${className ?? ''}`}>
      <h4><Check size={18} /> {title}</h4>
      <div className="outfit-garment-list">
        {garments.length > 0
          ? garments.map(garment => <OutfitGarmentCard key={garment.id} garment={garment} />)
          : <p className="outfit-empty-wardrobe">{emptyMessage}</p>}
      </div>
    </section>
  );
}

function OutfitGarmentCard({ garment }: { garment: OutfitGarmentCard }) {
  return (
    <article className="outfit-garment-card">
      {garment.imageUrl
        ? <img src={garment.imageUrl} alt={garment.name} loading="lazy" />
        : <div className="outfit-garment-image-placeholder" aria-hidden="true"><ImageIcon size={25} /></div>}
      <div>
        <span>{garment.category}</span>
        <h5>{garment.name}</h5>
        {garment.color && <p>{garment.color}</p>}
      </div>
    </article>
  );
}

function ExploreReferencesSection({
  references,
  complementaryItems,
  emptyMessage,
}: {
  references: ExploreReferenceImage[];
  complementaryItems: OutfitGarmentCard[];
  emptyMessage?: string;
}) {
  return (
    <section className="outfit-result-column outfit-result-complementary panel">
      <h4><ImageIcon size={18} /> Referencias de Explorar</h4>
      <div className="outfit-reference-list">
        {references.length > 0
          ? references.map(reference => <ExploreReferenceCard key={reference.id} reference={reference} />)
          : <p className="outfit-empty-wardrobe">{emptyMessage || 'No se utilizaron imágenes de referencia de Explorar para esta combinación.'}</p>}
      </div>
      <h5 className="outfit-reference-complements-title">Complementos de tu ropero</h5>
      <div className="outfit-garment-list">
        {complementaryItems.length > 0
          ? complementaryItems.map(garment => <OutfitGarmentCard key={garment.id} garment={garment} />)
          : <p className="outfit-empty-wardrobe">No hay prendas opcionales del ropero para sugerir.</p>}
      </div>
    </section>
  );
}

function ExploreReferenceCard({ reference }: { reference: ExploreReferenceImage }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="outfit-reference-card">
      {failed
        ? <div className="outfit-reference-placeholder"><ImageIcon size={22} aria-hidden="true" /><span>No se pudo cargar la imagen de referencia.</span></div>
        : <img
          src={reference.url}
          alt={`${reference.description} · ${reference.category}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />}
      <figcaption>
        <strong>{reference.category}</strong>
        <span>{reference.description}</span>
      </figcaption>
    </figure>
  );
}

function OutfitEvaluation({ evaluation, wardrobeMessage }: { evaluation: string | null; wardrobeMessage?: string }) {
  return (
    <section className="outfit-result-column outfit-explanation panel">
      <h4><Lightbulb size={18} /> Evaluación del outfit</h4>
      <div className="outfit-copy-section outfit-evaluation-copy">
        {evaluation
          ? <p>{evaluation}</p>
          : <p>{wardrobeMessage || 'La IA no pudo evaluar esta combinación. Podés intentarlo nuevamente.'}</p>}
      </div>
    </section>
  );
}

function SaveOutfitDialog({
  name,
  isSaving,
  error,
  onNameChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  isSaving: boolean;
  error: string | null;
  onNameChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onCancel();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSaving, onCancel]);
  return (
    <div className="outfit-save-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !isSaving) onCancel(); }}>
      <form className="outfit-save-dialog panel" role="dialog" aria-modal="true" aria-labelledby="save-outfit-title" onSubmit={onSubmit}>
        <span className="section-label">MIS OUTFITS</span>
        <h4 id="save-outfit-title" className="font-headline">Guardá esta combinación</h4>
        <p>Elegí un nombre para encontrar tu outfit fácilmente más adelante.</p>
        <label className="wardrobe-field" htmlFor="save-outfit-name">Nombre del outfit
          <input
            ref={inputRef}
            id="save-outfit-name"
            value={name}
            onChange={event => onNameChange(event.target.value)}
            maxLength={80}
            required
            autoComplete="off"
            placeholder="Ej. Casual para salir"
          />
        </label>
        {error && <p className="outfit-feedback-error" role="alert">{error}</p>}
        <div className="outfit-save-actions">
          <button type="button" className="btn-outline rounded-full px-5 py-3" onClick={onCancel} disabled={isSaving}>Cancelar</button>
          <button type="submit" className="btn-accent rounded-full px-5 py-3" disabled={isSaving || !name.trim()}>
            {isSaving ? <LoaderCircle size={17} aria-hidden="true" className="outfit-generating-icon" /> : <Check size={17} aria-hidden="true" />}
            {isSaving ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}
