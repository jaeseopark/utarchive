import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlaylistsPage from './PlaylistsPage';
import { api } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    api: {
      ...actual.api,
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

// eslint-disable-next-line no-restricted-syntax
const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

describe('PlaylistsPage', () => {
  it('shows loading and then renders playlist table', async () => {
    mockedApi.get.mockResolvedValueOnce([{ id: '1', name: 'Favorites', createdAt: new Date().toISOString() }]);
    mockedApi.get.mockResolvedValueOnce({ id: '1', name: 'Favorites', createdAt: new Date().toISOString(), songs: [] });

    render(
      <MemoryRouter initialEntries={['/playlists']}>
        <Routes>
          <Route path="/playlists" element={<PlaylistsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/loading playlists/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/favorites/i)).toBeInTheDocument());
  });

  it('opens modal and creates a new playlist', async () => {
    mockedApi.get.mockResolvedValueOnce([]);
    mockedApi.post.mockResolvedValueOnce({ id: '2', name: 'New Playlist', createdAt: new Date().toISOString() });

    render(
      <MemoryRouter initialEntries={['/playlists']}>
        <Routes>
          <Route path="/playlists" element={<PlaylistsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /new playlist/i }));
    fireEvent.change(screen.getByPlaceholderText(/my new playlist/i), { target: { value: 'New Playlist' } });
    fireEvent.click(screen.getByRole('button', { name: /create playlist/i }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalled());
  });
});
