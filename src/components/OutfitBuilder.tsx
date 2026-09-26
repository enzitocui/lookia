import { useState, type FormEvent } from 'react';
import { Check, Image as ImageIcon, Lightbulb, Sparkles } from 'lucide-react';

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
  wardrobeMessage?: string;
};

type OutfitBuilderProps = {
  result?: OutfitResult | null;
};

export default function OutfitBuilder({ result = null }: OutfitBuilderProps) {
  const [request, setRequest] = useState('');
  const [generatedResult, setGeneratedResult] = useState<OutfitResult | null>(result);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prompt = request.trim();
    if (!prompt || isGenerating) return;

    setIsGenerating(true);
    setError('');
    setGeneratedResult(null);

    try {
      const response = await fetch('/api/outfits/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ request: prompt })
      });
      const data = await response.json().catch(() => ({})) as Partial<OutfitResult> & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'No pudimos generar el outfit. Intentá nuevamente.');
      }
      if (!Array.isArray(data.garments) || !Array.isArray(data.references) || !data.explanation) {
        throw new Error('Recibimos una respuesta incompleta. Intentá nuevamente.');
      }
      setGeneratedResult(data as OutfitResult);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No pudimos generar el outfit. Intentá nuevamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="outfit-builder" aria-labelledby="outfit-page-title">
      <div className="outfit-builder-heading">
        <span className="section-label">LOOKIA · TU ESTILO, A TU MANERA</span>
        <h2 id="outfit-page-title" className="font-headline">Creá tu outfit</h2>
        <p>Contanos qué outfit estás buscando y LOOKIA se encargará de encontrar la combinación adecuada.</p>
      </div>

      <form className="outfit-request panel" onSubmit={handleSubmit}>
        <label className="outfit-request-label" htmlFor="outfit-request">
          ¿Qué tenés en mente?
        </label>
        <textarea
          id="outfit-request"
          value={request}
          maxLength={1000}
          disabled={isGenerating}
          onChange={event => {
            setRequest(event.target.value);
            if (error) setError('');
            if (generatedResult) setGeneratedResult(null);
          }}
          placeholder="Ejemplo: Quiero un outfit estilo Y2K para salir con amigos..."
          rows={6}
        />
        <div className="outfit-request-footer">
          <p>Podés describir libremente la ocasión, el estilo o cómo querés sentirte.</p>
          <button type="submit" className="btn-accent rounded-full px-6 py-3" disabled={!request.trim() || isGenerating}>
            <Sparkles size={18} aria-hidden="true" className={isGenerating ? 'outfit-generating-icon' : undefined} />
            {isGenerating ? 'Generando outfit…' : 'Generar outfit'}
          </button>
        </div>
        {error && <p className="outfit-feedback-error" role="alert">{error}</p>}
        {isGenerating && <p className="outfit-request-notice" role="status">Estamos revisando las referencias y tu ropero. Esto puede tardar unos segundos.</p>}
      </form>

      {generatedResult && <OutfitResultView result={generatedResult} />}
    </section>
  );
}

function OutfitResultView({ result }: { result: OutfitResult }) {
  return (
    <section className="outfit-result" aria-labelledby="outfit-result-title">
      <h3 id="outfit-result-title" className="font-headline">Tu propuesta</h3>
      <div className="outfit-result-grid">
        <section className="outfit-result-column panel" aria-labelledby="outfit-garments-title">
          <h4 id="outfit-garments-title"><Check size={18} /> Prendas elegidas</h4>
          <div className="outfit-garment-list">
            {result.garments.length > 0
              ? result.garments.map(garment => <OutfitGarmentCard key={garment.id} garment={garment} />)
              : <p className="outfit-empty-wardrobe">{result.wardrobeMessage || 'No hay prendas compatibles para mostrar.'}</p>}
          </div>
        </section>

        <section className="outfit-result-column panel" aria-labelledby="outfit-references-title">
          <h4 id="outfit-references-title"><ImageIcon size={18} /> Referencias</h4>
          <div className="outfit-reference-list">
            {result.references.map(reference => (
              <figure className="outfit-reference-card" key={reference.id}>
                <img src={reference.imageUrl} alt={reference.alt} loading="lazy" />
              </figure>
            ))}
          </div>
        </section>

        <OutfitExplanation explanation={result.explanation} />
      </div>
    </section>
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

function OutfitExplanation({ explanation }: { explanation: OutfitResult['explanation'] }) {
  return (
    <section className="outfit-result-column outfit-explanation panel" aria-labelledby="outfit-explanation-title">
      <h4 id="outfit-explanation-title"><Lightbulb size={18} /> Por qué este outfit</h4>
      <p>{explanation.requestMatch}</p>
      <h5>La combinación</h5>
      <ul>{explanation.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul>
      <h5>Consejos</h5>
      <ul>{explanation.tips.map((tip, index) => <li key={`${index}-${tip}`}>{tip}</li>)}</ul>
      <h5>Para complementar tu ropero</h5>
      <ul>{explanation.complementaryItems.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
    </section>
  );
}