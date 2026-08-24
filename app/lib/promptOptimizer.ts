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
