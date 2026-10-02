import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { CookbookPage } from './pages/CookbookPage';
import { HomePage } from './pages/HomePage';
import { InventoryPage } from './pages/InventoryPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'inventaire', element: <InventoryPage /> },
      { path: 'recettes', element: <CookbookPage /> },
    ],
  },
]);
