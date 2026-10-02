import { scaleRecipe } from '@kooka/shared';
import { ArrowLeft, ArrowRight, BookmarkCheck, Check, ListChecks, MessageCircleQuestion, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { CookingChips } from '../components/ActiveCooking';
import { AskSheet } from '../components/AskSheet';
import { IngredientsSheet } from '../components/IngredientsSheet';
import { StepTimer } from '../components/StepTimer';
import { useCookingMutations, useCookingSession } from '../hooks/useCooking';
import { useCookbookMutations } from '../hooks/useRecipes';
import { useWakeLock } from '../lib/wakeLock';

/** Mode cuisine : une étape par écran, minuteurs, questions. On peut le quitter et y revenir. */
export function CookPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { data: session, isLoading, error } = useCookingSession(id);
  const { update, finish, abandon } = useCookingMutations();
  const { save } = useCookbookMutations();
  const [panel, setPanel] = useState<'ingredients' | 'ask' | null>(null);
  useWakeLock();

  // « C'est prêt ! » prend la place de « Étape suivante » : on l'arme avec un léger délai
  // pour qu'un double appui ne termine pas la recette par erreur.
  const [finishArmed, setFinishArmed] = useState(false);

  // Navigation au clavier sur ordinateur.
  const step = session?.currentStep ?? 0;
  const last = (session?.recipe.steps.length ?? 1) - 1;
  const goTo = (n: number) => session && update.mutate({ id, currentStep: Math.max(0, Math.min(n, last)) });
  useEffect(() => {
    setFinishArmed(false);
    if (step !== last) return;
    const t = setTimeout(() => setFinishArmed(true), 700);
    return () => clearTimeout(t);
  }, [step, last]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panel) return;
      if (e.key === 'ArrowRight') goTo(step + 1);
      if (e.key === 'ArrowLeft') goTo(step - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (isLoading) return <p className="p-8 text-center text-sm text-muted">Chargement…</p>;
  if (error || !session) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-tomato-dark">{error?.message ?? 'Préparation introuvable'}</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-tomato-dark underline">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const recipe = scaleRecipe(session.recipe, session.servings);
  const current = recipe.steps[step]!;

  if (session.finishedAt) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl">{recipe.emoji}</span>
        <h1 className="mt-4 font-display text-3xl font-bold">Bon appétit !</h1>
        <p className="mt-2 text-muted">« {recipe.title} » est ajoutée à ton historique.</p>
        <button
          onClick={() => save.mutate(session.recipe)}
          disabled={save.isPending || save.isSuccess}
          className="mt-8 flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-3 font-semibold"
        >
          <BookmarkCheck size={18} /> {save.isSuccess ? 'Ajoutée à mon livre' : 'Ajouter à mon livre de recettes'}
        </button>
        <CookingChips className="mt-8 max-w-full" />
        <Link to="/" className="mt-6 font-semibold text-tomato-dark">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-4">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface"
          aria-label="Quitter (la préparation reste en cours)"
          title="Quitter — tu pourras reprendre plus tard"
        >
          <X size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold">
            {recipe.emoji} {recipe.title}
          </p>
          <p className="text-xs text-muted">{recipe.servings} pers.</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Abandonner cette préparation ?')) {
              abandon.mutate(id, { onSuccess: () => navigate('/', { replace: true }) });
            }
          }}
          className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-tomato-soft"
          aria-label="Abandonner la préparation"
        >
          <Trash2 size={18} />
        </button>
      </header>

      <CookingChips currentId={id} className="-mx-4 mt-3 px-4" />

      <div className="mt-4 flex gap-1" aria-hidden>
        {recipe.steps.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-tomato' : 'bg-line'}`}
            tabIndex={-1}
          />
        ))}
      </div>

      <main className="flex flex-1 flex-col py-6">
        <p className="text-sm font-semibold text-tomato-dark">
          Étape {step + 1} sur {recipe.steps.length}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight font-bold">{current.title}</h1>
        <p className="mt-4 text-xl leading-relaxed">{current.instruction}</p>

        {current.minutes !== null && (
          <div className="mt-6">
            <StepTimer sessionId={id} step={step} minutes={current.minutes} label={`${recipe.title} · ${current.title}`} />
          </div>
        )}
        {current.passive && (
          <p className="mt-3 text-sm text-muted">⏳ Temps d'attente : tu peux avancer une autre recette en attendant.</p>
        )}

        <div className="mt-auto flex gap-2 pt-8">
          <button
            onClick={() => setPanel('ingredients')}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-semibold"
          >
            <ListChecks size={18} /> Ingrédients
          </button>
          <button
            onClick={() => setPanel('ask')}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-semibold"
          >
            <MessageCircleQuestion size={18} /> Une question ?
          </button>
        </div>
      </main>

      <nav className="pb-safe sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-cream/95 px-4 pt-3 pb-4 backdrop-blur">
        <button
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="grid size-14 shrink-0 place-items-center rounded-full border border-line bg-surface disabled:opacity-40"
          aria-label="Étape précédente"
        >
          <ArrowLeft size={22} />
        </button>
        {step < last ? (
          <button
            onClick={() => goTo(step + 1)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tomato text-lg font-semibold text-cream"
          >
            Étape suivante <ArrowRight size={22} />
          </button>
        ) : (
          <button
            onClick={() => finish.mutate(id)}
            disabled={!finishArmed || finish.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-basil text-lg font-semibold text-cream transition-opacity disabled:opacity-60"
          >
            <Check size={22} /> C'est prêt !
          </button>
        )}
      </nav>

      {panel === 'ingredients' && <IngredientsSheet recipe={recipe} onClose={() => setPanel(null)} />}
      {panel === 'ask' && <AskSheet sessionId={id} recipe={recipe} step={step} onClose={() => setPanel(null)} />}
    </div>
  );
}
