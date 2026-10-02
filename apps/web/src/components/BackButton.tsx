import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';

export function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(fallback))}
      className="grid size-10 place-items-center rounded-full border border-line bg-surface"
      aria-label="Retour"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
