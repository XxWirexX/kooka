import type { RecipeIngredient } from '@kooka/shared';

const FRACTIONS: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' };

export function formatNumber(value: number): string {
  const whole = Math.floor(value);
  const frac = Math.round((value - whole) * 100) / 100;
  if (FRACTIONS[frac]) return whole === 0 ? FRACTIONS[frac]! : `${whole} ${FRACTIONS[frac]}`;
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function formatQuantity(i: RecipeIngredient): string {
  const parts: string[] = [];
  if (i.amount !== null) {
    parts.push(`${formatNumber(i.amount)}${i.unit ? ` ${i.unit}` : ''}`);
    if (i.grams !== null && i.unit !== 'g') parts.push(`(~${formatNumber(i.grams)} g)`);
  } else if (i.grams !== null) {
    parts.push(`~${formatNumber(i.grams)} g`);
  }
  if (i.note) parts.push(parts.length ? `· ${i.note}` : i.note);
  return parts.join(' ');
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}
