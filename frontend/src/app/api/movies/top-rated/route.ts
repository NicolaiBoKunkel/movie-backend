import { NextResponse } from "next/server";
import { fetchTopRatedMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");

  try {
    const data = await fetchTopRatedMovies(page);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Top rated error:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
