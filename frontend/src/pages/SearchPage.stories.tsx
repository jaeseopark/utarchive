import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import SearchPage from './SearchPage';
import { api } from '../api/client';

const meta: Meta<typeof SearchPage> = {
  title: 'Pages/SearchPage',
  component: SearchPage,
};

export default meta;

type Story = StoryObj<typeof SearchPage>;

const searchResults = {
  songs: [
    { id: 'song-1', title: 'Space Anthem', artistId: 'artist-1', preferred: true },
    { id: 'song-2', title: 'Moonlight Drive', artistId: 'artist-2', preferred: false },
  ],
  artists: [
    { id: 'artist-1', name: 'Astro Child', aliases: ['A.Child'] },
  ],
  albums: [
    { id: 'album-1', title: 'Galactic Path', artistId: 'artist-1', yearReleased: 2024 },
  ],
};

const createMockRouterDecorator = (initialEntries: string[], response: unknown) => {
  return (Story: () => ReactNode) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get = async () => response as any;
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <Story />
      </MemoryRouter>
    );
  };
};

export const WithResults: Story = {
  decorators: [createMockRouterDecorator(['/search?q=space'], searchResults)],
};

export const NoResults: Story = {
  decorators: [createMockRouterDecorator(['/search?q=missing'], { songs: [], artists: [], albums: [] })],
};
