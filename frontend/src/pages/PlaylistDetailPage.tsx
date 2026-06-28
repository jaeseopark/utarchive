import { useParams } from 'react-router-dom';

function PlaylistDetailPage() {
  const { id } = useParams<'id'>();

  return (
    <section>
      <h2 className="text-2xl font-semibold">Playlist detail</h2>
      <p className="mt-3 text-slate-400">Placeholder detail page for playlist ID: {id}</p>
    </section>
  );
}

export default PlaylistDetailPage;
