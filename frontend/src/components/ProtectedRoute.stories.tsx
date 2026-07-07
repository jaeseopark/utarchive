import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { SessionContext, type SessionContextValue } from '../context/SessionContext';

const content = <div>Protected content</div>;

const meta: Meta<typeof ProtectedRoute> = {
  title: 'Components/ProtectedRoute',
  component: ProtectedRoute,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/']}>{Story()}</MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProtectedRoute>;

const createContextValue = (overrides: Partial<SessionContextValue>): SessionContextValue => ({
  user: null,
  isLoading: false,
  login: async () => {
    /* noop */
  },
  logout: async () => {
    /* noop */
  },
  refreshSession: async () => {
    /* noop */
  },
  ...overrides,
});

export const Authenticated: Story = {
  decorators: [
    (Story) => (
      <SessionContext.Provider value={createContextValue({ user: { id: 'user-1' } })}>
        {Story()}
      </SessionContext.Provider>
    ),
  ],
  render: () => <ProtectedRoute>{content}</ProtectedRoute>,
};

export const Unauthenticated: Story = {
  decorators: [
    (Story) => (
      <SessionContext.Provider value={createContextValue({ user: null })}>
        {Story()}
      </SessionContext.Provider>
    ),
  ],
  render: () => <ProtectedRoute>{content}</ProtectedRoute>,
};

export const Loading: Story = {
  decorators: [
    (Story) => (
      <SessionContext.Provider value={createContextValue({ isLoading: true })}>
        {Story()}
      </SessionContext.Provider>
    ),
  ],
  render: () => <ProtectedRoute>{content}</ProtectedRoute>,
};
