import { Route, Routes } from 'react-router-dom';

import { AuthGate } from '@/features/auth/AuthGate';
import { Layout } from '@/shared/components/Layout';
import { CatalogPage } from '@/features/dinners/components/CatalogPage';
import { PlanPage } from '@/features/weekly-plan/components/PlanPage';
import { ShoppingListPage } from '@/features/shopping-list/components/ShoppingListPage';
import { CookingViewPage } from '@/features/cooking-view/components/CookingViewPage';

/**
 * Route shell for the app. All four pages — catalog, plan, shopping list,
 * cooking — are real routes as of this bolt, one per concern, per
 * `requirements.md`'s navigation constraint.
 */
export function App() {
  return (
    <AuthGate>
      <Layout>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
          <Route path="/cooking" element={<CookingViewPage />} />
        </Routes>
      </Layout>
    </AuthGate>
  );
}
