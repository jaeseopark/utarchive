import { Button } from "../../components/ui/Button";
import { useArtistAttributesEditor } from "../../components/ArtistAttributesEditor";
import type { Artist } from "../../api/schemas";

interface ArtistHeaderProps {
  artist: Artist;
}

export function ArtistHeader({ artist }: ArtistHeaderProps) {
  const artistEditorState = useArtistAttributesEditor(artist);

  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50/80 p-6 shadow-xl shadow-slate-200/20">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-xl font-semibold text-slate-900">{artist.name}</h3>
        <Button
          variant="secondary"
          onClick={artistEditorState.enterEditMode}
          disabled={artistEditorState.mode === "edit"}
        >
          Edit
        </Button>
      </div>
      <artistEditorState.Component />
    </div>
  );
}
