import { STOCK_LEVEL_LABELS, type StockLevel } from '@kooka/shared';

export const STOCK_STYLES: Record<StockLevel, string> = {
  plenty: 'bg-basil-soft text-basil',
  some: 'bg-basil-soft/60 text-basil',
  low: 'bg-saffron-soft text-saffron',
  out: 'bg-line text-muted',
};

export function StockBadge({ level }: { level: StockLevel }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STOCK_STYLES[level]}`}>
      {STOCK_LEVEL_LABELS[level]}
    </span>
  );
}
