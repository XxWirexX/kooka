import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { CookbookPage } from './pages/CookbookPage';
import { HomePage } from './pages/HomePage';
import { InventoryPage } from './pages/InventoryPage';
import { RecipePage } from './pages/RecipePage';
import { SavedRecipePage } from './pages/SavedRecipePage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'idee/:id', element: <RecipePage /> },
      { path: 'inventaire', element: <InventoryPage /> },
      { path: 'recettes', element: <CookbookPage /> },
      { path: 'recettes/:id', element: <SavedRecipePage /> },
    ],
  },
]);
