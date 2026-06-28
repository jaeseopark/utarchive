import { useParams } from 'react-router-dom';

function AlbumDetailPage() {
  const { id } = useParams<'id'>();

  return (
    <section>
      <h2 className="text-2xl font-semibold">Album detail</h2>
      <p className="mt-3 text-slate-400">Placeholder detail page for album ID: {id}</p>
    </section>
  );
}

export default AlbumDetailPage;
