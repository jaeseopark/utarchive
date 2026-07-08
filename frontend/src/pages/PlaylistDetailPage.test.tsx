import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlaylistDetailPage from './PlaylistDetailPage';
import { api } from '../api/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      post: vi.fn(),
    },
  };
});

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('PlaylistDetailPage', () => {
  it('renders playlist detail and handles rename UI', async () => {
    mockedApi.get.mockResolvedValueOnce({
      id: '1',
      name: 'Favorites',
      createdAt: new Date().toISOString(),
      songs: [],
    });

    render(
      <MemoryRouter initialEntries={['/playlists/1']}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/favorites/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /rename/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
