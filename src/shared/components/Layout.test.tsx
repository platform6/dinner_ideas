import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Layout } from '@/shared/components/Layout';
import { useAuth } from '@/features/auth/useAuth';

vi.mock('@/features/auth/useAuth');

const mockedUseAuth = vi.mocked(useAuth);

function renderLayout(path: string) {
  mockedUseAuth.mockReturnValue({ session: null, isLoading: false, signIn: vi.fn(), signOut: vi.fn() });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Layout>
        <div>Page content</div>
      </Layout>
    </MemoryRouter>,
  );
}

describe('Layout', () => {
  it('renders all 4 bottom tabs and the page content', () => {
    renderLayout('/');

    expect(screen.getByRole('link', { name: 'Catalog' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'List' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cooking' })).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('marks the tab matching the current route as active', () => {
    renderLayout('/plan');

    expect(screen.getByRole('link', { name: 'This week' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current');
  });

  it('exposes store-config and log-out header actions, not in the tab bar', () => {
    renderLayout('/');

    const storeConfigLink = screen.getByRole('link', { name: /store setup/i });
    expect(storeConfigLink).toHaveAttribute('href', '/store-config');
    expect(storeConfigLink.closest('nav')).toBeNull();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls signOut when the log-out button is clicked', async () => {
    const signOut = vi.fn();
    mockedUseAuth.mockReturnValue({ session: null, isLoading: false, signIn: vi.fn(), signOut });
    render(
      <MemoryRouter>
        <Layout>
          <div />
        </Layout>
      </MemoryRouter>,
    );

    screen.getByRole('button', { name: /log out/i }).click();
    expect(signOut).toHaveBeenCalled();
  });
});
