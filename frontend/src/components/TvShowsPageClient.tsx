"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { fetchTvShows } from "@/lib/tvshows";
import TvShowCard from "./TvShowCard";
import ParallaxPage from "@/components/ParallaxPage";

interface TvShow {
  mediaId: string;
  originalTitle: string;
  voteAverage: number;
  genres: string[];
  posterPath?: string | null;
}

export default function TvShowsPageClient() {
  const [shows, setShows] = useState<TvShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const currentPage = Number(searchParams.get("page") || "1");
  const limit = 12;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTvShows(currentPage, limit);
        console.log("TV SHOW DATA:", data);

        setShows(data);
      } catch (err) {
        console.error("TV Shows fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentPage]);

  const goToPage = (page: number) => {
    router.push(`/tvshows?page=${page}`);
  };

  return (
    <ParallaxPage backgroundImage="/home.jpg" title="TV Shows with PostgreSQL">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {shows.map((show) => (
              <TvShowCard key={show.mediaId} show={show} />
            ))}
          </div>

          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="bg-white text-teal-700 font-bold px-3 py-1 rounded hover:bg-teal-100 disabled:opacity-50"
            >
              Previous
            </button>

            <span className="px-4 py-2 text-center font-medium">
              Page {currentPage}
            </span>

            <button
              onClick={() => goToPage(currentPage + 1)}
              className="bg-white text-teal-700 font-bold px-3 py-1 rounded hover:bg-teal-100"
            >
              Next
            </button>
          </div>
        </>
      )}
    </ParallaxPage>
  );
}
