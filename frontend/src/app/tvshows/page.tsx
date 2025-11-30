import { fetchTvShows } from "@/lib/tvshows";
import TvShowCard from "@/components/TvShowCard";

export default async function TvShowsPage() {
  const shows = await fetchTvShows();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        TV Shows (from SQL Database)
      </h1>

      {shows.length === 0 && (
        <p className="text-gray-600">No TV shows found.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {shows.map((show: any) => (
          <TvShowCard key={show.mediaId} show={show} />
        ))}
      </div>
    </div>
  );
}
