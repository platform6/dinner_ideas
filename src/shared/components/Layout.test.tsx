import { describe, expect, it, vi } from 'vitest';

import { Layout } from '@/shared/components/Layout';
import { useAuth } from '@/features/auth/useAuth';
import { renderWithProviders, screen } from '@/test/render';

vi.mock('@/features/auth/useAuth');

const mockedUseAuth = vi.mocked(useAuth);

function renderLayout(path: string, signOut = vi.fn()) {
  mockedUseAuth.mockReturnValue({ session: null, isLoading: false, signIn: vi.fn(), signOut });
  renderWithProviders(
    <Layout>
      <div>Page content</div>
    </Layout>,
    { route: path },
  );
  return { signOut };
}

/**
 * Under jsdom the `matchMedia` stub in `src/test/setup.ts` makes `useBreakpointValue` resolve to
 * its `base` value, so `Layout` renders its phone view (header + fixed bottom tab bar). The rail
 * is the md+ view and is exercised in the browser, not here.
 */
describe('Layout (phone view)', () => {
  it('renders all 4 nav links exactly once, plus the page content', () => {
    renderLayout('/');

    for (const name of ['Catalog', 'This week', 'List', 'Cooking']) {
      expect(screen.getAllByRole('link', { name })).toHaveLength(1);
    }
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('marks the nav item matching the current route as active', () => {
    renderLayout('/plan');

    expect(screen.getByRole('link', { name: 'This week' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current');
  });

  it('exposes Store setup and Log out outside the tab-bar nav', () => {
    renderLayout('/');

    const storeSetup = screen.getByRole('link', { name: /store setup/i });
    expect(storeSetup).toHaveAttribute('href', '/store-config');
    expect(storeSetup.closest('nav')).toBeNull();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls signOut when Log out is clicked', () => {
    const { signOut } = renderLayout('/');

    screen.getByRole('button', { name: /log out/i }).click();
    expect(signOut).toHaveBeenCalled();
  });

  it('shows the "Dino Recipes" wordmark and the dino mark in the header', () => {
    renderLayout('/');

    expect(screen.getByText('Dino Recipes')).toBeInTheDocument();
    expect(screen.queryByText('Dinner Ideas')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dino Recipes' })).toHaveAttribute('src', '/dino-mark.png');
  });
});
