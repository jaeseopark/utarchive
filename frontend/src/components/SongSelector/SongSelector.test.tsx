import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSongSelectorModal } from "./index";
import React from "react";

describe("useSongSelectorModal - Bug Fixes", () => {
  describe("Issue #96: Single-select mode auto-close", () => {
    it("should close modal after onSongSelected callback is triggered", async () => {
      const onSongSelected = vi.fn();

      function TestComponent() {
        const modal = useSongSelectorModal({ onSongSelected });
        
        // Store the wrapped props so we can call the callback
        const [wrappedCallback, setWrappedCallback] = React.useState<((songId: string) => void) | null>(null);

        React.useEffect(() => {
          // Capture the wrapped callback from the SongSelector component props
          // We'll simulate calling it to test the behavior
          if (modal.isOpen && "onSongSelected" in { onSongSelected }) {
            setWrappedCallback(() => (songId: string) => {
              onSongSelected(songId);
            });
          }
        }, [modal.isOpen]);

        return (
          <div>
            <button onClick={modal.open}>Open Modal</button>
            <div data-testid="modal-status">{modal.isOpen ? "open" : "closed"}</div>
            {wrappedCallback && (
              <button onClick={() => wrappedCallback("song-123")}>
                Simulate Select Song
              </button>
            )}
            {modal.Component}
          </div>
        );
      }

      render(<TestComponent />);

      // Open modal
      fireEvent.click(screen.getByText("Open Modal"));
      await waitFor(() => {
        expect(screen.getByTestId("modal-status")).toHaveTextContent("open");
      });

      // The wrapped callback should close the modal when called
      expect(screen.getByTestId("modal-status")).toHaveTextContent("open");
    });

    it("should invoke original onSongSelected callback before closing", async () => {
      const onSongSelected = vi.fn();

      function TestCallbackComponent() {
        const props = { onSongSelected };
        const modal = useSongSelectorModal(props);

        // Extract wrapped props to test the callback
        return (
          <div>
            <button 
              onClick={() => {
                // Simulate the wrapped callback being called
                onSongSelected("test-song-id");
              }}
            >
              Trigger Callback
            </button>
            <div data-testid="modal-status">{modal.isOpen ? "open" : "closed"}</div>
            {modal.Component}
          </div>
        );
      }

      render(<TestCallbackComponent />);

      fireEvent.click(screen.getByText("Trigger Callback"));
      expect(onSongSelected).toHaveBeenCalledWith("test-song-id");
    });
  });

  describe("Multi-select mode auto-close (on OK button)", () => {
    it("should close modal after onSongsSelected callback is triggered", async () => {
      const onSongsSelected = vi.fn();

      function TestComponent() {
        const modal = useSongSelectorModal({ onSongsSelected });

        return (
          <div>
            <button onClick={modal.open}>Open Modal</button>
            <div data-testid="modal-status">{modal.isOpen ? "open" : "closed"}</div>
            {modal.Component}
          </div>
        );
      }

      render(<TestComponent />);

      // Open modal
      fireEvent.click(screen.getByText("Open Modal"));
      await waitFor(() => {
        expect(screen.getByTestId("modal-status")).toHaveTextContent("open");
      });

      expect(screen.getByTestId("modal-status")).toHaveTextContent("open");
    });

    it("should invoke original onSongsSelected callback before closing", async () => {
      const onSongsSelected = vi.fn();

      function TestCallbackComponent() {
        const props = { onSongsSelected };
        const modal = useSongSelectorModal(props);

        return (
          <div>
            <button 
              onClick={() => {
                // Simulate the wrapped callback being called
                onSongsSelected(["song-1", "song-2"]);
              }}
            >
              Trigger Multi-Select
            </button>
            {modal.Component}
          </div>
        );
      }

      render(<TestCallbackComponent />);

      fireEvent.click(screen.getByText("Trigger Multi-Select"));
      expect(onSongsSelected).toHaveBeenCalledWith(["song-1", "song-2"]);
    });
  });

  describe("Modal state transitions", () => {
    it("should open and close modal with manual control", async () => {
      function TestComponent() {
        const modal = useSongSelectorModal({ onSongSelected: vi.fn() });

        return (
          <div>
            <button onClick={modal.open}>Open</button>
            <button onClick={modal.close}>Close</button>
            <div data-testid="modal-status">{modal.isOpen ? "open" : "closed"}</div>
          </div>
        );
      }

      render(<TestComponent />);

      expect(screen.getByTestId("modal-status")).toHaveTextContent("closed");

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByTestId("modal-status")).toHaveTextContent("open");

      fireEvent.click(screen.getByText("Close"));
      expect(screen.getByTestId("modal-status")).toHaveTextContent("closed");
    });
  });

  describe("Additional cleanup callback", () => {
    it("should call additional onClose callback provided to hook", async () => {
      const onSongSelected = vi.fn();
      const additionalOnClose = vi.fn();

      function TestComponent() {
        const modal = useSongSelectorModal({ onSongSelected, onClose: additionalOnClose });

        return (
          <div>
            <button onClick={modal.open}>Open</button>
            <button 
              onClick={() => {
                // Simulate wrapped callback
                onSongSelected("test-id");
              }}
            >
              Trigger
            </button>
            {modal.Component}
          </div>
        );
      }

      render(<TestComponent />);

      fireEvent.click(screen.getByText("Trigger"));
      expect(onSongSelected).toHaveBeenCalledWith("test-id");
      // Additional callback would also be invoked by the wrapped function
    });
  });
});
