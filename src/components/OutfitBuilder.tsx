import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Image as ImageIcon, Lightbulb, Sparkles, X } from 'lucide-react';

export type OutfitResult = {
  garments: Array<{
    id: string | number;
    name: string;
    category: string;
    color?: string;
    imageUrl: string;
  }>;
  references: Array<{
    id: string | number;
    imageUrl: string;
    alt: string;
  }>;
  explanation: {
    reasons: string[];
    requestMatch: string;
    tips: string[];
    complementaryItems: string[];
  };
  evaluation?: string;
  wardrobeMessage?: string;
};

const previewGarments = [
  { id: 'preview-garment-1', name: 'Prenda 1', category: 'Espacio para prenda' },
  { id: 'preview-garment-2', name: 'Prenda 2', category: 'Espacio para prenda' },
  { id: 'preview-garment-3', name: 'Prenda 3', category: 'Espacio para prenda' },
];

const previewReferences = [
  { id: 'preview-reference-1', alt: 'Espacio para imagen de referencia' },
  { id: 'preview-reference-2', alt: 'Espacio para imagen de referencia' },
  { id: 'preview-reference-3', alt: 'Espacio para imagen de referencia' },
];

const previewRecommendation = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo vel neque malesuada consequat. Suspendisse potenti. Curabitur at lectus sed arcu feugiat varius, ut posuere sem facilisis.';
const previewEvaluation = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent euismod, erat sed commodo consequat, tellus justo tincidunt nibh, a volutpat sapien nisl non urna.';

type OutfitBuilderProps = {
  result?: OutfitResult | null;
};

export default function OutfitBuilder({ result = null }: OutfitBuilderProps) {
  const [request, setRequest] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!request.trim()) return;
    setIsPreviewOpen(true);
  };

  return (
    <section className="outfit-builder" aria-labelledby="outfit-page-title">
      <div className="outfit-builder-heading">
        <span className="section-label">LOOKIA · TU ESTILO, A TU MANERA</span>
        <h2 id="outfit-page-title" className="font-headline">Creá tu outfit</h2>
        <p>Contanos qué outfit estás buscando. La generación estará disponible próximamente.</p>
      </div>

      <form className="outfit-request panel" onSubmit={handleSubmit}>
        <label className="outfit-request-label" htmlFor="outfit-request">
          ¿Qué tenés en mente?
        </label>
        <textarea
          id="outfit-request"
          value={request}
          maxLength={1000}
          onChange={event => {
            setRequest(event.target.value);
          }}
          placeholder="Ejemplo: Quiero un outfit estilo Y2K para salir con amigos..."
          rows={6}
        />
        <div className="outfit-request-footer">
          <p>Podés describir libremente la ocasión, el estilo o cómo querés sentirte.</p>
          <button type="submit" className="btn-accent rounded-full px-6 py-3" disabled={!request.trim()}>
            <Sparkles size={18} aria-hidden="true" />
            Generar outfit
          </button>
        </div>
      </form>

      {isPreviewOpen && <OutfitResultView result={result} onClose={() => setIsPreviewOpen(false)} />}
    </section>
  );
}

function OutfitResultView({ result, onClose }: { result: OutfitResult | null; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="outfit-preview-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="outfit-preview-modal" role="dialog" aria-modal="true" aria-labelledby="outfit-result-title" tabIndex={-1} ref={dialogRef}>
        <header className="outfit-preview-header">
          <div>
            <span className="section-label">LOOKIA · VISTA PREVIA</span>
            <h3 id="outfit-result-title" className="font-headline">Tu propuesta de outfit</h3>
            <p>Diseño de muestra · la generación todavía no está conectada</p>
          </div>
          <button type="button" className="icon-button outfit-preview-close" aria-label="Cerrar ventana" onClick={onClose}><X size={22} /></button>
        </header>
        <div className="outfit-result-grid">
          <section className="outfit-result-column panel" aria-labelledby="outfit-garments-title">
            <h4 id="outfit-garments-title"><Check size={18} /> Prendas seleccionadas</h4>
            <div className="outfit-garment-list">
              {result
                ? result.garments.length > 0
                  ? result.garments.map(garment => <OutfitGarmentCard key={garment.id} garment={garment} />)
                  : <p className="outfit-empty-wardrobe">{result.wardrobeMessage || 'No hay prendas seleccionadas para mostrar.'}</p>
                : previewGarments.map(garment => <OutfitGarmentPlaceholder key={garment.id} garment={garment} />)}
            </div>
          </section>

          <section className="outfit-result-column panel" aria-labelledby="outfit-references-title">
            <h4 id="outfit-references-title"><ImageIcon size={18} /> Imágenes de referencia</h4>
            <div className="outfit-reference-list">
              {result
                ? result.references.length > 0
                  ? result.references.map(reference => (
                  <figure className="outfit-reference-card" key={reference.id}>
                    <img src={reference.imageUrl} alt={reference.alt} loading="lazy" />
                  </figure>
                  ))
                  : <p className="outfit-empty-wardrobe">No hay imágenes de referencia para mostrar.</p>
                : previewReferences.map(reference => <ReferenceImagePlaceholder key={reference.id} reference={reference} />)}
            </div>
          </section>

          <OutfitExplanation
            recommendation={result?.explanation.requestMatch ?? previewRecommendation}
            evaluation={result?.evaluation ?? previewEvaluation}
            isPlaceholder={!result}
            explanation={result?.explanation}
          />
        </div>
      </section>
    </div>
  );
}

function OutfitGarmentPlaceholder({ garment }: { garment: typeof previewGarments[number] }) {
  return (
    <article className="outfit-garment-card outfit-garment-placeholder">
      <div className="outfit-garment-image-placeholder" aria-hidden="true"><ImageIcon size={25} /></div>
      <div><span>{garment.category}</span><h5>{garment.name}</h5></div>
    </article>
  );
}

function ReferenceImagePlaceholder({ reference }: { reference: typeof previewReferences[number] }) {
  return (
    <figure className="outfit-reference-card outfit-reference-placeholder" role="img" aria-label={reference.alt}>
      <ImageIcon size={28} aria-hidden="true" />
      <span>Espacio para imagen</span>
    </figure>
  );
}

function OutfitGarmentCard({ garment }: { garment: OutfitResult['garments'][number] }) {
  return (
    <article className="outfit-garment-card">
      <img src={garment.imageUrl} alt={garment.name} loading="lazy" />
      <div>
        <span>{garment.category}</span>
        <h5>{garment.name}</h5>
        {garment.color && <p>{garment.color}</p>}
      </div>
    </article>
  );
}

function OutfitExplanation({
  recommendation,
  evaluation,
  isPlaceholder,
  explanation,
}: {
  recommendation: string;
  evaluation: string;
  isPlaceholder: boolean;
  explanation?: OutfitResult['explanation'];
}) {
  return (
    <section className="outfit-result-column outfit-explanation panel" aria-labelledby="outfit-explanation-title">
      <h4 id="outfit-explanation-title"><Lightbulb size={18} /> Recomendación / evaluación de IA</h4>
      <div className="outfit-copy-section">
        <h5>Recomendación de IA</h5>
        {isPlaceholder && <span className="outfit-copy-demo-label">Texto de muestra · Lorem Ipsum</span>}
        <p>{recommendation}</p>
      </div>
      <div className="outfit-copy-section outfit-evaluation-section">
        <h5>Evaluación del outfit</h5>
        {isPlaceholder && <span className="outfit-copy-demo-label">Texto de muestra · Lorem Ipsum</span>}
        <p>{evaluation}</p>
      </div>
      {explanation && <div className="outfit-future-details">
        {explanation.reasons.length > 0 && <><h5>Por qué se eligieron las prendas</h5><ul>{explanation.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul></>}
        {explanation.tips.length > 0 && <><h5>Observaciones</h5><ul>{explanation.tips.map((tip, index) => <li key={`${index}-${tip}`}>{tip}</li>)}</ul></>}
        {explanation.complementaryItems.length > 0 && <><h5>Para complementar tu ropero</h5><ul>{explanation.complementaryItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></>}
      </div>}
    </section>
  );
}