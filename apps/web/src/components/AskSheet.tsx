import type { Recipe } from '@kooka/shared';
import { SendHorizontal } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAsk } from '../hooks/useCooking';
import { useStoredState } from '../lib/storage';
import { Sheet } from './Sheet';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = ['Comment savoir si c’est cuit ?', 'Par quoi remplacer un ingrédient ?', 'Je peux préparer ça à l’avance ?'];

/** Questions ponctuelles pendant la préparation : réponses courtes, centrées sur la recette. */
export function AskSheet({ sessionId, recipe, step, onClose }: { sessionId: number; recipe: Recipe; step: number; onClose: () => void }) {
  const [messages, setMessages] = useStoredState<Message[]>('session', `kooka:ask:${sessionId}`, []);
  const [text, setText] = useState('');
  const ask = useAsk(sessionId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, ask.isPending]);

  const send = (question: string) => {
    const q = question.trim();
    if (!q || ask.isPending) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setText('');
    ask.mutate(
      { question: q, stepIndex: step, history },
      { onSuccess: ({ answer }) => setMessages((m) => [...m, { role: 'assistant', content: answer }]) },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <Sheet title="Une question ?" onClose={onClose}>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-2">
        {messages.length === 0 && (
          <>
            <p className="text-sm text-muted">
              Pose ta question sur « {recipe.steps[step]?.title} » ou sur la recette. Kooka répond en quelques lignes.
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} onClick={() => send(q)} className="rounded-full border border-line px-3 py-1.5 text-sm">
                  {q}
                </button>
              ))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user' ? 'ml-auto bg-tomato text-cream' : 'bg-cream'
            }`}
          >
            {m.content}
          </p>
        ))}
        {ask.isPending && <p className="w-fit animate-pulse rounded-2xl bg-cream px-4 py-2.5 text-sm text-muted">Kooka réfléchit…</p>}
        {ask.error && <p className="text-sm text-tomato-dark">{ask.error.message}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ta question…"
          maxLength={500}
          className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-3 outline-none focus:border-tomato"
        />
        <button
          type="submit"
          disabled={!text.trim() || ask.isPending}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-tomato text-cream disabled:opacity-50"
          aria-label="Envoyer"
        >
          <SendHorizontal size={20} />
        </button>
      </form>
    </Sheet>
  );
}
