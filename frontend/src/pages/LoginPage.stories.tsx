import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { SessionContext, type SessionContextValue } from '../context/SessionContext';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/LoginPage',
  component: LoginPage,
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/login']}>
        {Story()}
      </MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof LoginPage>;

const defaultContextValue: SessionContextValue = {
  user: null,
  isLoading: false,
  login: async () => {
    /* noop */
  },
  logout: async () => {
    /* noop */
  },
};

export const Default: Story = {
  decorators: [
    (Story) => (
      <SessionContext.Provider value={defaultContextValue}>{Story()}</SessionContext.Provider>
    ),
  ],
};

export const Loading: Story = {
  decorators: [
    (Story) => (
      <SessionContext.Provider value={{ ...defaultContextValue, isLoading: true }}>
        {Story()}
      </SessionContext.Provider>
    ),
  ],
};
