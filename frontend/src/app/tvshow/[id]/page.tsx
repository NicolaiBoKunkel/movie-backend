import { notFound } from "next/navigation";
import { fetchTvShowById } from "@/lib/tvshows";
import TvShowDetailClient from "@/components/TvShowDetailClient";

export default async function TvShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const tvShow = await fetchTvShowById(id);

    return <TvShowDetailClient show={tvShow} />;
  } catch (err) {
    console.error("TV show detail fetch error:", err);
    return notFound();
  }
}
