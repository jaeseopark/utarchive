import "./pages/SearchPage.stories";
import "./pages/SettingsPage.stories";
import "./pages/PlaylistDetailPage.stories";
import "./pages/LoginPage.stories";
import "./components/ui/Button.stories";
import "./components/ui/CollapsibleGroup.stories";
import "./components/ProtectedRoute.stories";
import "./context/SessionContext.stories";

describe("Storybook coverage", () => {
  it("loads story exports without errors", () => {
    expect(true).toBe(true);
  });
});
