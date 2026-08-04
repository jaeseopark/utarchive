import type { Meta, StoryObj } from "@storybook/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SettingsPage from "./SettingsPage";
import { SETTINGS_ROUTES } from "./settings/routes";

const meta: Meta<typeof SettingsPage> = {
  title: "Pages/SettingsPage",
  component: SettingsPage,
};

export default meta;

type Story = StoryObj<typeof SettingsPage>;

export const Globals: Story = {
  render: () => {
    const firstRoute = SETTINGS_ROUTES[0]!;

    return (
      <MemoryRouter initialEntries={[`/settings/${firstRoute.path}`]}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />}>
            <Route path={firstRoute.path} element={<firstRoute.Component />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  },
};