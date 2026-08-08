import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlbumAttributeEditor } from "../../components/AlbumAttributeEditor";
import { Button } from "../../components/ui/Button";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { useAlbumsStore } from "../../stores/useAlbumsStore";
import type { Album } from "../../api/schemas";

interface AlbumInfoSectionProps {
  album: Album;
}

const AlbumInfoSection = ({ album }: AlbumInfoSectionProps) => {
  const navigate = useNavigate();
  // Always call the hook unconditionally
  const albumEditorState = useAlbumAttributeEditor(album ?? null);
  const deleteAlbum = useAlbumsStore((state) => state.deleteAlbum);
  const subscribe = useAlbumsStore((state) => state.subscribe);
  const unsubscribe = useAlbumsStore((state) => state.unsubscribe);
  const confirmDialog = useConfirmDialog();

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!albumEditorState) {
    return null;
  }

  const handleDeleteClick = () => {
    confirmDialog.open({
      title: "Delete Album",
      message: "Are you sure you want to delete this album? This action cannot be undone.",
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
    
    // Subscribe to deletion event - when WebSocket confirms deletion with isOwnOrigin=true, navigate away
    const handleDeleted = (deletedId: string) => {
      if (deletedId === album.id) {
        navigate("/albums");
      }
    };

    subscribe({
      event: 'deleted',
      callback: handleDeleted,
    });

    try {
      await deleteAlbum(album.id);
    } catch {
      setDeleteError("Failed to delete album");
      // Unsubscribe on error since we won't navigate away
      unsubscribe({
        event: 'deleted',
        callback: handleDeleted,
      });
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-900">Album Information</h3>
          <div className="mt-4">{albumEditorState.Component}</div>
        </div>
        {albumEditorState.mode === "view" && (
          <div className="flex gap-2 ml-4 mt-1 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={albumEditorState.enterEditMode}
            >
              ✎ Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>
      {deleteError && (
        <div className="mt-4 rounded-lg border border-rose-400 bg-rose-100/30 p-3 text-sm text-rose-700">
          {deleteError}
        </div>
      )}
      <confirmDialog.Component />
    </section>
  );
};

export default AlbumInfoSection;
