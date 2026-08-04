import { type ComponentType } from "react";
import SettingsGlobalsPage from "./SettingsGlobalsPage";

export interface SettingsRouteEntry {
  path: string;
  label: string;
  Component: ComponentType;
}

const settingsRoutes: SettingsRouteEntry[] = [
  {
    path: "globals",
    label: "Globals",
    Component: SettingsGlobalsPage,
  },
];

const uniquePaths = new Set(settingsRoutes.map((route) => route.path));
if (uniquePaths.size !== settingsRoutes.length) {
  throw new Error("SETTINGS_ROUTES contains duplicate route paths.");
}

export const SETTINGS_ROUTES = settingsRoutes;
export const SETTINGS_DEFAULT_ROUTE_PATH = SETTINGS_ROUTES[0]?.path ?? "";
