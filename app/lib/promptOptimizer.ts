import { SchemaType, type ObjectSchema } from '@google/generative-ai';

export interface OptimizerFlows {
  genChat: boolean;
  genCowork: boolean;
  genCode: boolean;
  genSystemUser: boolean;
  genGemini: boolean;
}

export interface OptimizerResult {
  spiegazione: string;
  promptChat?: string;
  promptCowork?: string;
  promptCode?: string;
  promptSystem?: string;
  promptUser?: string;
  promptGemini?: string;
}

export interface GenerativeResponseLike {
  text: string;
  finishReason?: string;
}

/**
 * Builds the Gemini `responseSchema` for the requested output flows so the
 * model is constrained to emit valid, well-formed JSON directly (structured
 * output), instead of markdown that has to be extracted and hand-repaired.
 */
export function buildResponseSchema(flows: OptimizerFlows): ObjectSchema {
  const properties: ObjectSchema['properties'] = {
    spiegazione: { type: SchemaType.STRING },
  };
  const required: string[] = ['spiegazione'];

  if (flows.genChat) {
    properties.promptChat = { type: SchemaType.STRING };
    required.push('promptChat');
  }
  if (flows.genCowork) {
    properties.promptCowork = { type: SchemaType.STRING };
    required.push('promptCowork');
  }
  if (flows.genCode) {
    properties.promptCode = { type: SchemaType.STRING };
    required.push('promptCode');
  }
  if (flows.genSystemUser) {
    properties.promptSystem = { type: SchemaType.STRING };
    properties.promptUser = { type: SchemaType.STRING };
    required.push('promptSystem', 'promptUser');
  }
  if (flows.genGemini) {
    properties.promptGemini = { type: SchemaType.STRING };
    required.push('promptGemini');
  }

  return { type: SchemaType.OBJECT, properties, required };
}

/**
 * Schema for the "structured scaffold" mode: Gemini fills only the project
 * section of the CLAUDE.md/GEMINI.md template, returned as a single string.
 */
export function buildScaffoldSchema(): ObjectSchema {
  return {
    type: SchemaType.OBJECT,
    properties: { progetto: { type: SchemaType.STRING } },
    required: ['progetto'],
  };
}

/**
 * Builds the meta-prompt sent to Gemini, given the per-flow instruction blocks.
 *
 * Lives here rather than inline in the hook so that production and the offline
 * eval harness share ONE definition: a hand-copied mirror had already drifted
 * (the harness was missing the formatting constraint), which meant the harness
 * measured a prompt we never actually shipped.
 */
export function buildOptimizerSystemInstruction(tasks: string[]): string {
  return `Sei un esperto Prompt Engineer. Devi generare versioni ottimizzate dello stesso prompt in base ai flussi richiesti.

      Esegui ESATTAMENTE i flussi di lavoro specificati qui sotto:
      ${tasks.join('\n')}

      VINCOLO UNIVERSALE: NON modificare mai i segnaposto di anonimizzazione come [EMAIL_X], [TELEFONO_X].
      VINCOLO DI FORMATTAZIONE (leggibilità): nei prompt generati che usano tag (es. <role>, <context>, <output_format>), separa ogni tag/sezione di primo livello con UNA RIGA VUOTA e non concatenare i tag sulla stessa riga; nei formati Markdown, separa le sezioni con una riga vuota.

      Nel campo "spiegazione" fornisci una breve spiegazione delle migliorie apportate in base ai formati richiesti.`;
}

export class TruncatedResponseError extends Error {
  constructor() {
    super(
      "La risposta dell'AI è stata troncata perché troppo lunga (limite di token raggiunto). " +
        'Riduci il testo del prompt in ingresso o seleziona meno formati di output e riprova.',
    );
    this.name = 'TruncatedResponseError';
  }
}

/**
 * Parses the raw Gemini response. Because generation now runs in structured
 * JSON mode, the only failure mode left to handle explicitly is truncation
 * (finishReason === 'MAX_TOKENS'), which used to surface as an opaque
 * JSON.parse crash.
 */
export function parseOptimizerResponse<T = OptimizerResult>(result: GenerativeResponseLike): T {
  if (result.finishReason === 'MAX_TOKENS') {
    throw new TruncatedResponseError();
  }
  return JSON.parse(result.text);
}
