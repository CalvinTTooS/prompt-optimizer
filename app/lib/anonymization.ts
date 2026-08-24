export interface CensoredEntry {
  original: string;
  placeholder: string;
}

/** Luhn checksum — real credit card numbers satisfy it, arbitrary long digit runs don't. */
function passesLuhnCheck(digitsOnly: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = Number(digitsOnly[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isPlausibleCardNumber(candidate: string): boolean {
  const digitsOnly = candidate.replace(/[ -]/g, '');
  return digitsOnly.length >= 13 && digitsOnly.length <= 19 && passesLuhnCheck(digitsOnly);
}

const PATTERNS: { id: string; regex: RegExp; validate?: (candidate: string) => boolean }[] = [
  { id: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { id: 'TELEFONO', regex: /\b(?:\+39|0039)?[\s./-]*(3[1-6]\d)[\s./-]*(\d)[\s./-]*(\d)[\s./-]*(\d)[\s./-]*(\d)[\s./-]*(\d)[\s./-]*(\d)[\s./-]*(\d)\b/g },
  { id: 'CARTA', regex: /\b(?:\d[ -]*?){13,19}\b/g, validate: isPlausibleCardNumber },
  { id: 'CCV', regex: /(ccv|cvv)[\s:=-]*(\d{3,4})\b/gi },
];

/**
 * Detects and masks PII (email, phone, card, CCV) in `textToProcess`,
 * extending `currentCensored` with newly found values. A value already
 * present in `currentCensored` is masked with its existing placeholder
 * instead of being left in plain text.
 */
export function runAnonymization(
  textToProcess: string,
  currentCensored: CensoredEntry[],
): { safeText: string; detected: CensoredEntry[] } {
  let safeText = textToProcess;
  const detected = [...currentCensored];

  PATTERNS.forEach((p) => {
    safeText = safeText.replace(p.regex, (match, _g1, g2) => {
      const target = p.id === 'CCV' ? g2 : match;
      if (!target) return match;

      const trimmedTarget = target.trim();
      if (p.validate && !p.validate(trimmedTarget)) return match;

      const existing = detected.find((d) => d.original === trimmedTarget);
      if (existing) {
        return match.replace(target, existing.placeholder);
      }

      const placeholder = `[${p.id}_${detected.length + 1}]`;
      detected.push({ original: trimmedTarget, placeholder });
      return match.replace(target, placeholder);
    });
  });

  return { safeText, detected };
}
