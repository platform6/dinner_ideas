import { Route, Routes } from 'react-router-dom';

import { AuthGate } from '@/features/auth/AuthGate';
import { Layout } from '@/shared/components/Layout';
import { CatalogPage } from '@/features/dinners/components/CatalogPage';
import { PlanPage } from '@/features/weekly-plan/components/PlanPage';
import { ShoppingListPage } from '@/features/shopping-list/components/ShoppingListPage';
import { CookingViewPage } from '@/features/cooking-view/components/CookingViewPage';
import { StoreConfigPage } from '@/features/store-config/components/StoreConfigPage';
import { SuppressedPage } from '@/features/dinners/components/SuppressedPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

/**
 * Route shell for the app. Catalog, plan, shopping list, cooking, store-config, and suppressed
 * are all real routes, one per concern, per `requirements.md`'s navigation constraint.
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
          <Route path="/store-config" element={<StoreConfigPage />} />
          <Route path="/suppressed" element={<SuppressedPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </AuthGate>
  );
}
