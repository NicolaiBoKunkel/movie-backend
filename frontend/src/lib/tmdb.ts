const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

// Make sure the key exists
if (!API_KEY) {
  throw new Error("TMDB_API_KEY is missing. Add it to .env.local");
}

async function tmdbGet(path: string) {
  const url = `${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=en-US`;

  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    console.error("TMDB error:", res.status, res.statusText);
    throw new Error("Failed to fetch from TMDB");
  }

  return res.json();
}


// Top-rated movies
export async function fetchTopRatedMovies(page: number = 1) {
  return tmdbGet(`/movie/top_rated?page=${page}`);
}

export async function fetchMovieDetails(id: string | number) {
  return tmdbGet(`/movie/${id}`);
}

export async function fetchMovieCredits(id: string | number) {
  return tmdbGet(`/movie/${id}/credits`);
}

export async function fetchMovieTrailer(id: string | number) {
  const data = await tmdbGet(`/movie/${id}/videos`);

  const trailer = data.results?.find(
    (v: any) => v.type === "Trailer" && v.site === "YouTube"
  );

  return trailer?.key || null;
}
