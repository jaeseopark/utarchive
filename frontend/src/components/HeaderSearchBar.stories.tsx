import { type Meta, type StoryObj } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";
import { HeaderSearchBar } from "./HeaderSearchBar";

const meta = {
  title: "Components/HeaderSearchBar",
  component: HeaderSearchBar,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof HeaderSearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default header search bar with placeholder text
 */
export const Default: Story = {
  args: {
    className: "w-64",
  },
};

/**
 * Search bar in a realistic header context
 */
export const InHeader: Story = {
  args: {
    className: "w-64",
  },
  decorators: [
    (Story) => (
      <header className="flex items-center justify-between gap-4 rounded-3xl border border-slate-300 bg-slate-50/90 p-5 shadow-xl shadow-slate-200/40">
        <div className="flex-shrink-0">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
            utarchive
          </p>
        </div>

        <div className="flex-1" />

        <Story />

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Menu
          </button>
        </div>
      </header>
    ),
  ],
};

/**
 * Features demonstrated:
 * - Magnifying glass icon on the left
 * - Rounded input field
 * - Focus state with blue border and shadow
 * - Clear button (X) appears when text is entered
 * - Keyboard shortcut hint in placeholder (⌘+F)
 * - Smooth transitions and hover states
 *
 * User Interactions:
 * 1. Click the search field or press ⌘+F to focus
 * 2. Type to search
 * 3. Click the X button or press Backspace/Delete to clear
 * 4. Press Enter to navigate to search results page
 */
export const Features: Story = {
  args: {
    className: "w-64",
  },
  render: (args) => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600">
          Empty State
        </h3>
        <div className="rounded-lg bg-slate-50 p-4">
          <HeaderSearchBar {...args} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600">
          Keyboard Shortcuts
        </h3>
        <div className="space-y-2 rounded-lg bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            Press <kbd className="rounded bg-white px-2 py-1 text-xs font-semibold">⌘+F</kbd> to focus the search input
          </p>
          <p className="text-sm text-slate-600">
            Press <kbd className="rounded bg-white px-2 py-1 text-xs font-semibold">Enter</kbd> to search
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-600">
          Design Elements
        </h3>
        <ul className="space-y-1 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          <li>• Magnifying glass icon positioned on inner-left</li>
          <li>• Clear button (X) appears on inner-right when text is entered</li>
          <li>• Rounded-full border for pill-shaped appearance</li>
          <li>• Blue focus state with ring and shadow</li>
          <li>• Smooth transitions for all interactive states</li>
        </ul>
      </div>
    </div>
  ),
};
