import { BookOpen } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function CookbookPage() {
  return (
    <>
      <PageHeader title="Mes recettes" />
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-12 text-center text-muted">
        <BookOpen size={32} />
        <p className="mt-3 text-sm">Les recettes que tu sauvegardes apparaîtront ici.</p>
      </div>
    </>
  );
}
