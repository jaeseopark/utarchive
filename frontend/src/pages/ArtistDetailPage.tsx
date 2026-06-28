import { useParams } from 'react-router-dom';

function ArtistDetailPage() {
  const { id } = useParams<'id'>();

  return (
    <section>
      <h2 className="text-2xl font-semibold">Artist detail</h2>
      <p className="mt-3 text-slate-400">Placeholder detail page for artist ID: {id}</p>
    </section>
  );
}

export default ArtistDetailPage;
