'use client';

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MovieCard from "./movieCard";
import ParallaxPage from "@/components/ParallaxPage";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  overview: string;
  release_date: string;
}

interface TMDBResponse<T> {
  page: number;
  total_pages: number;
  results: T[];
  total_results: number;
}

const HighRatedMovies = () => {
  const [data, setData] = useState<TMDBResponse<Movie> | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Number(searchParams.get("page") || "1");

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/movies/top-rated?page=${currentPage}`);

        if (!res.ok) {
          throw new Error("Failed to fetch top-rated movies");
        }

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Failed to load highest-rated movies");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [currentPage]);

  const goToPage = (page: number) => {
    router.push(`/highestRatedMovies?page=${page}`);
  };

  if (error) return <div>{error}</div>;
  if (isLoading || !data) return <div>Loading...</div>;

  return (
    <ParallaxPage
      backgroundImage="/home.jpg"
      title={
        <span data-cy="movies-page-title">
          Highest Rated Movies with TMDB API
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.results.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          data-cy="movies-prev-btn"
          disabled={currentPage <= 1}
          onClick={() => goToPage(currentPage - 1)}
          className="bg-white text-teal-700 font-bold px-3 py-1 rounded hover:bg-teal-100 disabled:opacity-50"
        >
          Previous
        </button>

        <span
          data-cy="movies-current-page"
          className="px-4 py-2 text-center font-medium"
        >
          Page {currentPage}
        </span>

        <button
          data-cy="movies-next-btn"
          disabled={currentPage >= data.total_pages}
          onClick={() => goToPage(currentPage + 1)}
          className="bg-white text-teal-700 font-bold px-3 py-1 rounded hover:bg-teal-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </ParallaxPage>
  );
};

export default HighRatedMovies;
