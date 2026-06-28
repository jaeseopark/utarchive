import { useParams } from 'react-router-dom';

function SongDetailPage() {
  const { id } = useParams<'id'>();

  return (
    <section>
      <h2 className="text-2xl font-semibold">Song detail</h2>
      <p className="mt-3 text-slate-400">Placeholder detail page for song ID: {id}</p>
    </section>
  );
}

export default SongDetailPage;
