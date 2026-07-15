import { useAlbumAttributeEditor } from "../../components/AlbumAttributeEditor";
import { Button } from "../../components/ui/Button";
import type { Album } from "../../api/schemas";

interface AlbumInfoSectionProps {
  album: Album;
  onEditClick: () => void;
}

const AlbumInfoSection = ({ album, onEditClick }: AlbumInfoSectionProps) => {
  // Always call the hook unconditionally
  const albumEditorState = useAlbumAttributeEditor(album ?? null);

  if (!albumEditorState) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-900">Album Information</h3>
          <div className="mt-4">{albumEditorState.Component}</div>
        </div>
        {albumEditorState.mode === "view" && (
          <Button
            variant="secondary"
            onClick={onEditClick}
            className="ml-4 mt-1 flex-shrink-0"
          >
            ✎ Edit
          </Button>
        )}
      </div>
    </section>
  );
};

export default AlbumInfoSection;
