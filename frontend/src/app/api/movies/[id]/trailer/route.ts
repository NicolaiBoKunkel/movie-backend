import { NextResponse } from "next/server";
import { fetchMovieTrailer } from "@/lib/tmdb";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const trailerKey = await fetchMovieTrailer(id);
    return NextResponse.json({ trailerKey });
  } catch (err) {
    console.error("Trailer error:", err);
    return NextResponse.json(
      { error: "Failed to fetch trailer" },
      { status: 500 }
    );
  }
}
