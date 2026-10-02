import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { RootLayout } from './components/RootLayout';
import { CookPage } from './pages/CookPage';
import { CookbookPage } from './pages/CookbookPage';
import { HomePage } from './pages/HomePage';
import { InventoryPage } from './pages/InventoryPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { RecipePage } from './pages/RecipePage';
import { SavedRecipePage } from './pages/SavedRecipePage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'idee/:id', element: <RecipePage /> },
          { path: 'inventaire', element: <InventoryPage /> },
          { path: 'recettes', element: <CookbookPage /> },
          { path: 'recettes/:id', element: <SavedRecipePage /> },
          { path: 'profil', element: <PreferencesPage /> },
        ],
      },
      // Le mode cuisine occupe tout l'écran, sans la barre de navigation.
      { path: 'cuisine/:id', element: <CookPage /> },
    ],
  },
]);
