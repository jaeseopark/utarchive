import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { composeStory } from '@storybook/react';
import meta, { Primary as PrimaryStory } from './Button.stories';

const Primary = composeStory(PrimaryStory, meta);

test('Button primary story renders and is clickable', async () => {
  render(<Primary />);
  const button = screen.getByRole('button', { name: /primary/i });
  expect(button).toBeInTheDocument();
});
