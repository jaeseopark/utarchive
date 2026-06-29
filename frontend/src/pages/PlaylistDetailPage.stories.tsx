import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import PlaylistDetailPage from './PlaylistDetailPage';
import { api } from '../api/client';

const meta: Meta<typeof PlaylistDetailPage> = {
  title: 'Pages/PlaylistDetailPage',
  component: PlaylistDetailPage,
};

export default meta;

type Story = StoryObj<typeof PlaylistDetailPage>;

const playlistDetail = {
  id: '1',
  name: 'Favorites',
  createdAt: new Date().toISOString(),
  songs: [
    { position: 0, song: { id: 'song-1', title: 'Space Anthem', preferred: true, filePath: null } },
    { position: 1, song: { id: 'song-2', title: 'Moonlight Drive', preferred: false, filePath: null } },
  ],
};

const createMockRouterDecorator = (response: unknown) => {
  return (Story: () => ReactNode) => {
    api.get = async () => response as any;
    return (
      <MemoryRouter initialEntries={['/playlists/1']}>
        <Story />
      </MemoryRouter>
    );
  };
};

export const Default: Story = {
  decorators: [createMockRouterDecorator(playlistDetail)],
};

export const EmptyPlaylist: Story = {
  decorators: [createMockRouterDecorator({ ...playlistDetail, songs: [] })],
};
