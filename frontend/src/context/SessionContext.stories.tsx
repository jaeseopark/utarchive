import type { Meta, StoryObj } from '@storybook/react';
import { SessionProvider, SessionContext } from './SessionContext';

const meta: Meta<typeof SessionProvider> = {
  title: 'Context/SessionProvider',
  component: SessionProvider,
};

export default meta;

type Story = StoryObj<typeof SessionProvider>;

export const Default: Story = {
  render: () => (
    <SessionProvider>
      <SessionContext.Consumer>
        {(value) => (
          <div>
            <div>Loading: {value?.isLoading ? 'true' : 'false'}</div>
            <div>User: {value?.user?.id ?? 'none'}</div>
          </div>
        )}
      </SessionContext.Consumer>
    </SessionProvider>
  ),
};
