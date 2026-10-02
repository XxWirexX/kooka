import { X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

/** Liste de mots-clés : on tape, Entrée ou virgule pour ajouter, croix pour retirer. */
export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [text, setText] = useState('');

  const commit = () => {
    const added = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !values.some((v) => v.toLowerCase() === t.toLowerCase()));
    if (added.length) onChange([...values, ...added].slice(0, 30));
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !text && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-surface p-2">
      {values.map((v) => (
        <span key={v} className="flex items-center gap-1 rounded-full bg-cream py-1 pr-1 pl-3 text-sm">
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full p-0.5 text-muted hover:bg-line"
            aria-label={`Retirer ${v}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-w-32 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
      />
    </div>
  );
}
