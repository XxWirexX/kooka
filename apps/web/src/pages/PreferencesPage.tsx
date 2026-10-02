import {
  ADVENTURE_LABELS,
  COOKING_TIME_LABELS,
  CUISINES,
  DEFAULT_STAPLES,
  DISHES_LABELS,
  SKILL_LABELS,
  type Preferences,
} from '@kooka/shared';
import { Check, LogOut, Minus, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { PageHeader } from '../components/PageHeader';
import { TagInput } from '../components/TagInput';
import { useAuth, useLogout } from '../hooks/useAuth';
import { usePreferences, useUpdatePreferences } from '../hooks/usePreferences';

const INSTRUCTIONS_EXAMPLE =
  "Ex. : J'aime les recettes qui me font progresser. Je connais les bases et j'adore les sauces travaillées. N'hésite pas à me proposer des techniques plus avancées.";

export function PreferencesPage() {
  const { preferences, isSuccess } = usePreferences();
  const update = useUpdatePreferences();
  const { data: auth } = useAuth();
  const logout = useLogout();
  const [draft, setDraft] = useState<Preferences>(preferences);

  // Le brouillon part des préférences enregistrées, une fois chargées.
  useEffect(() => {
    if (isSuccess) setDraft(preferences);
  }, [isSuccess, preferences]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <>
      <PageHeader title="Mon profil" subtitle="Kooka s'en sert pour adapter ses idées et ses recettes. Tout est facultatif." />

      <div className="space-y-7">
        <Section title="Pour combien de personnes ?">
          <div className="flex w-fit items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button
              onClick={() => set('servings', Math.max(1, draft.servings - 1))}
              className="grid size-10 place-items-center rounded-full hover:bg-cream"
              aria-label="Moins"
            >
              <Minus size={18} />
            </button>
            <span className="min-w-20 text-center font-semibold">
              {draft.servings} pers.
            </span>
            <button
              onClick={() => set('servings', Math.min(12, draft.servings + 1))}
              className="grid size-10 place-items-center rounded-full hover:bg-cream"
              aria-label="Plus"
            >
              <Plus size={18} />
            </button>
          </div>
        </Section>

        <Section title="Temps en cuisine">
          <Choice options={COOKING_TIME_LABELS} value={draft.cookingTime} onChange={(v) => set('cookingTime', v)} />
        </Section>
        <Section title="Ton niveau">
          <Choice options={SKILL_LABELS} value={draft.skill} onChange={(v) => set('skill', v)} />
        </Section>
        <Section title="Envie de découverte">
          <Choice options={ADVENTURE_LABELS} value={draft.adventure} onChange={(v) => set('adventure', v)} />
        </Section>
        <Section title="Vaisselle">
          <Choice options={DISHES_LABELS} value={draft.dishes} onChange={(v) => set('dishes', v)} />
        </Section>

        <Section title="Cuisines que tu aimes">
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => {
              const on = draft.favoriteCuisines.includes(c);
              return (
                <button
                  key={c}
                  onClick={() =>
                    set('favoriteCuisines', on ? draft.favoriteCuisines.filter((x) => x !== c) : [...draft.favoriteCuisines, c])
                  }
                  aria-pressed={on}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium ${
                    on ? 'border-tomato bg-tomato-soft text-tomato-dark' : 'border-line bg-surface'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Ingrédients que tu adores">
          <TagInput values={draft.likes} onChange={(v) => set('likes', v)} placeholder="champignons, citron…" />
        </Section>
        <Section title="À éviter" hint="Allergies, dégoûts : Kooka ne les proposera jamais.">
          <TagInput values={draft.avoid} onChange={(v) => set('avoid', v)} placeholder="coriandre, fruits de mer…" />
        </Section>

        <Section title="Basiques du placard" hint="Comptés comme disponibles sans avoir à les ajouter à l'inventaire.">
          <label className="mb-3 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm">J'ai toujours ces basiques chez moi</span>
            <input
              type="checkbox"
              checked={draft.hasStaples}
              onChange={(e) => set('hasStaples', e.target.checked)}
              className="size-5 accent-tomato"
            />
          </label>
          {draft.hasStaples && (
            <>
              <TagInput values={draft.staples} onChange={(v) => set('staples', v)} placeholder="ajouter un basique…" />
              {draft.staples.join() !== DEFAULT_STAPLES.join() && (
                <button onClick={() => set('staples', DEFAULT_STAPLES)} className="mt-2 text-xs font-medium text-muted underline">
                  Revenir à la liste par défaut
                </button>
              )}
            </>
          )}
        </Section>

        <Section title="Comment tu cuisines" hint="Décris tes habitudes et tes envies, Kooka en tiendra compte.">
          <textarea
            value={draft.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            maxLength={600}
            rows={4}
            placeholder={INSTRUCTIONS_EXAMPLE}
            className="w-full rounded-2xl border border-line bg-surface p-3 text-sm outline-none focus:border-tomato"
          />
          <p className="mt-1 text-right text-xs text-muted">{draft.instructions.length}/600</p>
        </Section>
      </div>

      {(dirty || update.isSuccess) && (
        <div className="sticky bottom-28 z-30 mt-6">
          <button
            onClick={() => update.mutate(draft)}
            disabled={!dirty || update.isPending}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-4 font-semibold shadow-lg ${
              dirty ? 'bg-tomato text-cream shadow-tomato/30' : 'bg-basil-soft text-basil shadow-none'
            }`}
          >
            {dirty ? 'Enregistrer' : (
              <>
                <Check size={18} /> Enregistré
              </>
            )}
          </button>
          {update.error && <p className="mt-2 text-center text-sm text-tomato-dark">{update.error.message}</p>}
        </div>
      )}

      {auth?.required && (
        <button
          onClick={() => logout.mutate()}
          className="mx-auto mt-10 flex items-center gap-2 text-sm font-medium text-muted"
        >
          <LogOut size={16} /> Se déconnecter
        </button>
      )}
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-2 text-sm text-muted">{hint}</p>}
      <div className={hint ? '' : 'mt-2'}>{children}</div>
    </section>
  );
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.entries(options) as [T, string][]).map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={`rounded-full border px-3.5 py-2 text-sm font-medium ${
            value === key ? 'border-tomato bg-tomato-soft text-tomato-dark' : 'border-line bg-surface'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
