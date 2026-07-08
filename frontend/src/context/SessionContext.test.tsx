import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { SessionProvider, useSession } from './SessionContext';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const TestConsumer = () => {
  const { user, isLoading, login, logout } = useSession();

  return (
    <div>
      <div>loading:{isLoading ? 'yes' : 'no'}</div>
      <div>user:{user?.id ?? 'none'}</div>
      <button type="button" onClick={() => login({ id: 'user-1', password: 'secret', totpCode: '123456' })}>
        login
      </button>
      <button type="button" onClick={() => logout()}>
        logout
      </button>
    </div>
  );
};

describe('SessionContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('restores session on mount when /auth/me succeeds', async () => {
    mockedApi.get.mockResolvedValue({ id: 'restored-user' });

    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText('loading:no')).toBeInTheDocument());
    expect(screen.getByText('user:restored-user')).toBeInTheDocument();
  });

  it('logs in and updates session user when login succeeds', async () => {
    mockedApi.get.mockRejectedValue(new Error('No session'));
    mockedApi.post.mockResolvedValue({ id: 'logged-in-user' });

    render(
      <SessionProvider>
        <TestConsumer />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText('loading:no')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByText('user:logged-in-user')).toBeInTheDocument());
  });
});
