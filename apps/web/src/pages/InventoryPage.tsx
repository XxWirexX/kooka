import { normalizeIngredientName, type InventoryItem, type StockLevel } from '@kooka/shared';
import { Plus, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { IngredientSheet } from '../components/IngredientSheet';
import { PageHeader } from '../components/PageHeader';
import { StockBadge } from '../components/StockBadge';
import { useInventory, useInventoryMutations } from '../hooks/useInventory';

const NEXT_LEVEL: Record<StockLevel, StockLevel> = { plenty: 'some', some: 'low', low: 'out', out: 'some' };
const UNCATEGORIZED = 'Autres';

export function InventoryPage() {
  const { data: items = [], isLoading, error } = useInventory();
  const { quickAdd, update } = useInventoryMutations();
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const { groups, out } = useMemo(() => groupItems(items, search), [items, search]);
  const inStock = items.length - items.filter((i) => i.stockLevel === 'out').length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    quickAdd.mutate(text, { onSuccess: () => setText('') });
  };

  return (
    <>
      <PageHeader
        title="Mon inventaire"
        subtitle={items.length ? `${inStock} ingrédient${inStock > 1 ? 's' : ''} en stock` : 'Ce que tu as chez toi'}
      />

      <form onSubmit={submit} className="sticky top-2 z-10 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="carottes, poulet, riz…"
          aria-label="Ajouter des ingrédients (séparés par des virgules)"
          enterKeyHint="done"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3.5 shadow-sm outline-none focus:border-tomato"
        />
        <button
          type="submit"
          disabled={quickAdd.isPending || !text.trim()}
          className="grid size-[52px] shrink-0 place-items-center rounded-full bg-tomato text-cream shadow-md shadow-tomato/30 disabled:opacity-50"
          aria-label="Ajouter"
        >
          <Plus size={24} />
        </button>
      </form>
      {quickAdd.error && <p className="mt-2 px-2 text-sm text-tomato-dark">{quickAdd.error.message}</p>}
      <p className="mt-2 px-2 text-xs text-muted">Sépare plusieurs ingrédients par des virgules. Le reste est facultatif.</p>

      {items.length > 6 && (
        <label className="mt-5 flex items-center gap-2 rounded-full bg-line/50 px-4 py-2.5 text-muted">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher"
            type="search"
            className="w-full bg-transparent text-ink outline-none"
          />
        </label>
      )}

      {isLoading && <p className="mt-8 text-center text-sm text-muted">Chargement…</p>}
      {error && <p className="mt-8 text-center text-sm text-tomato-dark">{error.message}</p>}
      {!isLoading && !error && items.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted">
          Ton inventaire est vide.
          <br />
          Ajoute ce que tu as acheté, même sans quantités.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {groups.map(([category, list]) => (
          <section key={category}>
            {groups.length > 1 && (
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">{category}</h2>
            )}
            <ItemList
              items={list}
              onEdit={setEditing}
              onCycle={(i) => update.mutate({ id: i.id, stockLevel: NEXT_LEVEL[i.stockLevel] })}
            />
          </section>
        ))}

        {out.length > 0 && (
          <details className="opacity-80">
            <summary className="mb-2 cursor-pointer px-1 text-xs font-semibold tracking-wide text-muted uppercase select-none">
              Épuisés ({out.length})
            </summary>
            <ItemList
              items={out}
              onEdit={setEditing}
              onCycle={(i) => update.mutate({ id: i.id, stockLevel: NEXT_LEVEL[i.stockLevel] })}
            />
          </details>
        )}
      </div>

      {editing && <IngredientSheet key={editing.id} item={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ItemList({
  items,
  onEdit,
  onCycle,
}: {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onCycle: (item: InventoryItem) => void;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <li key={item.id} className="flex items-center">
          <button onClick={() => onEdit(item)} className="flex min-w-0 flex-1 items-baseline gap-2 px-4 py-3.5 text-left">
            <span className="truncate font-medium first-letter:uppercase">{item.name}</span>
            {item.quantity !== null && (
              <span className="shrink-0 text-sm text-muted">
                {item.quantity.toLocaleString('fr-FR')} {item.unit}
              </span>
            )}
          </button>
          <button
            onClick={() => onCycle(item)}
            className="py-3 pr-4 pl-2"
            aria-label={`Changer le stock de ${item.name}`}
            title="Toucher pour changer le niveau de stock"
          >
            <StockBadge level={item.stockLevel} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function groupItems(items: InventoryItem[], search: string) {
  const needle = normalizeIngredientName(search);
  const visible = needle ? items.filter((i) => normalizeIngredientName(i.name).includes(needle)) : items;

  const byCategory = new Map<string, InventoryItem[]>();
  const out: InventoryItem[] = [];
  for (const item of visible) {
    if (item.stockLevel === 'out') {
      out.push(item);
      continue;
    }
    const key = item.category ?? UNCATEGORIZED;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  }
  const groups = [...byCategory.entries()].sort(([a], [b]) =>
    a === UNCATEGORIZED ? 1 : b === UNCATEGORIZED ? -1 : a.localeCompare(b, 'fr'),
  );
  return { groups, out };
}
