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
  posterPath: string | null;
  overview: string | null;
  firstAirDate: string | null;
}

export default function TvShowsPageClient() {
  const [shows, setShows] = useState<TvShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  const currentPage = Number(searchParams.get("page") || "1");
  const searchQuery = searchParams.get("search") || "";
  const limit = 12;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetchTvShows(currentPage, limit, searchQuery);
        setShows(data);
      } catch (err) {
        console.error("TV Shows fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [currentPage, searchQuery]);

  const goToPage = (page: number) => {
    router.push(`/tvshows?page=${page}&search=${searchQuery}`);
  };

  const handleSearch = () => {
    const input = document.querySelector(
      '[data-cy="tv-search-input"]'
    ) as HTMLInputElement;

    const value = input?.value || "";
    router.push(`/tvshows?page=1&search=${value}`);
  };

  return (
    <ParallaxPage
      backgroundImage="/home.jpg"
      title={<span data-cy="tvshows-page-title">TV Shows with PostgreSQL</span>}
    >
      {/* SEARCH BAR */}
      <div className="flex justify-center mt-4 mb-6 gap-2">
        <input
          data-cy="tv-search-input"
          type="text"
          placeholder="Search TV shows..."
          defaultValue={searchQuery}
          className="border px-3 py-2 rounded w-64 text-black"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />

        <button
          data-cy="tv-search-btn"
          onClick={handleSearch}
          className="bg-teal-700 text-white font-bold px-4 py-2 rounded hover:bg-teal-800"
        >
          Search
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            data-cy="tvshows-list"
          >
            {shows.map((show) => (
              <TvShowCard key={show.mediaId} show={show} />
            ))}

            {shows.length === 0 && (
              <div
                data-cy="tvshows-empty"
                className="text-center col-span-full text-white text-xl"
              >
                No TV shows found.
              </div>
            )}
          </div>

          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              data-cy="tvshows-prev-btn"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="bg-white text-teal-700 font-bold px-3 py-1 rounded hover:bg-teal-100 disabled:opacity-50"
            >
              Previous
            </button>

            <span
              data-cy="tvshows-current-page"
              className="px-4 py-2 text-center font-medium"
            >
              Page {currentPage}
            </span>

            <button
              data-cy="tvshows-next-btn"
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
