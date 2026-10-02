import {
  STOCK_LEVEL_LABELS,
  STOCK_LEVELS,
  SUGGESTED_CATEGORIES,
  type InventoryItem,
  type StockLevel,
} from '@kooka/shared';
import { Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useInventoryMutations } from '../hooks/useInventory';
import { STOCK_STYLES } from './StockBadge';

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

/** Feuille d'édition d'un ingrédient. Tous les champs sauf le nom sont facultatifs. */
export function IngredientSheet({ item, onClose }: Props) {
  const { update, remove } = useInventoryMutations();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity?.toString() ?? '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [category, setCategory] = useState(item.category ?? '');
  const [stockLevel, setStockLevel] = useState<StockLevel>(item.stockLevel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const qty = quantity.trim() === '' ? null : Number(quantity.replace(',', '.'));
    update.mutate(
      {
        id: item.id,
        name,
        quantity: qty !== null && Number.isFinite(qty) && qty > 0 ? qty : null,
        unit,
        category,
        stockLevel,
      },
      { onSuccess: onClose },
    );
  };

  const error = update.error ?? remove.error;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={onClose} />
      <form
        onSubmit={submit}
        className="pb-safe relative w-full max-w-lg rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Modifier</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-cream" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <label className="block text-sm font-medium">
          Nom
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 outline-none focus:border-tomato"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Il m'en reste…</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {STOCK_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setStockLevel(level)}
                aria-pressed={stockLevel === level}
                className={`rounded-xl px-1 py-2 text-xs font-medium transition ${
                  stockLevel === level ? `${STOCK_STYLES[level]} ring-2 ring-current` : 'bg-cream text-muted'
                }`}
              >
                {STOCK_LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
        </fieldset>

        <details className="group mt-4" open={item.quantity !== null || item.category !== null}>
          <summary className="cursor-pointer text-sm font-medium text-muted select-none">
            Détails facultatifs
          </summary>
          <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
            <label className="text-sm font-medium">
              Quantité
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                inputMode="decimal"
                placeholder="ex. 500"
                className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 outline-none focus:border-tomato"
              />
            </label>
            <label className="text-sm font-medium">
              Unité
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={20}
                placeholder="g, pièces, L…"
                className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 outline-none focus:border-tomato"
              />
            </label>
            <label className="col-span-2 text-sm font-medium">
              Catégorie
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="categories"
                maxLength={40}
                placeholder="ex. Fruits & légumes"
                className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 outline-none focus:border-tomato"
              />
              <datalist id="categories">
                {SUGGESTED_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>
        </details>

        {error && <p className="mt-3 text-sm text-tomato-dark">{error.message}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => remove.mutate(item.id, { onSuccess: onClose })}
            className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-tomato-dark hover:bg-tomato-soft"
          >
            <Trash2 size={18} /> Supprimer
          </button>
          <button
            type="submit"
            disabled={update.isPending}
            className="flex-1 rounded-full bg-tomato py-3 text-sm font-semibold text-cream disabled:opacity-60"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
