import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useArtistAttributesEditor } from "../../components/ArtistAttributesEditor";
import { useArtistsStore } from "../../stores/useArtistsStore";
import type { Artist } from "../../api/schemas";

interface ArtistHeaderProps {
  artist: Artist;
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  const navigate = useNavigate();
  const artistEditorState = useArtistAttributesEditor(artist);
  const deleteArtist = useArtistsStore((state) => state.deleteArtist);
  const confirmDialog = useConfirmDialog();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = () => {
    confirmDialog.open({
      title: "Delete Artist",
      message: "Are you sure you want to delete this artist? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      isLoading: isDeleting,
      onConfirm: handleConfirmDelete,
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteArtist(artist.id);
      navigate("/artists");
    } catch {
      setDeleteError("Failed to delete artist");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-slate-900">{artist.name}</h3>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={artistEditorState.enterEditMode}
              disabled={artistEditorState.mode === "edit" || isDeleting}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
        {deleteError && (
          <div className="mb-4 rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
            {deleteError}
          </div>
        )}
        <artistEditorState.Component />
      </div>

      <confirmDialog.Component />
    </>
  );
}
