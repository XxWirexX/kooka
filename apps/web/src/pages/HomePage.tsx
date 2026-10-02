import { ChefHat, Refrigerator } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { useInventory } from '../hooks/useInventory';

/** Écran d'accueil : accueillera les suggestions IA (étape 5 de la feuille de route). */
export function HomePage() {
  const { data: items = [] } = useInventory();
  const available = items.filter((i) => i.stockLevel !== 'out');

  return (
    <>
      <PageHeader title="Qu'est-ce qu'on mange ?" subtitle="Achète ce qui te fait envie. Kooka s'occupe du reste." />

      <section className="rounded-3xl bg-tomato p-6 text-cream shadow-lg shadow-tomato/20">
        <ChefHat size={32} />
        <h2 className="mt-3 font-display text-xl font-semibold">Tes suggestions arrivent bientôt</h2>
        <p className="mt-1 text-sm text-cream/85">
          {available.length === 0
            ? 'Commence par ajouter quelques ingrédients : Kooka te proposera des plats à partir de ce que tu as.'
            : `Kooka connaît ${available.length} ingrédient${available.length > 1 ? 's' : ''} chez toi. La génération de recettes sera branchée à la prochaine étape.`}
        </p>
        <Link
          to="/inventaire"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-tomato-dark"
        >
          <Refrigerator size={18} />
          {available.length === 0 ? 'Remplir mon inventaire' : 'Voir mon inventaire'}
        </Link>
      </section>
    </>
  );
}
