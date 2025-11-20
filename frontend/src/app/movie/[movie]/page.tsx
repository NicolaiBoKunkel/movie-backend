import { notFound } from "next/navigation";
import MovieDetailClient from "@/components/MovieDetailClient";
import {
  fetchMovieDetails,
  fetchMovieCredits,
  fetchMovieTrailer,
} from "@/lib/tmdb";

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ movie: string }>;
}) {
  const { movie } = await params;
  const id = movie;

  try {
    const [movieData, creditsData, trailerKey] = await Promise.all([
      fetchMovieDetails(id),
      fetchMovieCredits(id),
      fetchMovieTrailer(id),
    ]);

    return (
      <MovieDetailClient
        movie={movieData}
        cast={creditsData.cast || []}
        trailerKey={trailerKey}
      />
    );
  } catch (err) {
    console.error("Movie detail fetch error:", err);
    return notFound();
  }
}
