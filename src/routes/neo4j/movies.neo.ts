import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j from "neo4j-driver";

const router = Router();

   //Canonical DTO + Mapping Helpers

export type MovieDto = {
  mediaId: string;
  tmdbId: string;
  mediaType: "movie";
  originalTitle: string;
  overview: string | null;
  originalLanguage: string;
  status: string;
  popularity: number | null;
  voteAverage: number;
  voteCount: number | null;
  releaseDate: string | null;
  budget: number | null;
  revenue: number | null;
  adultFlag: boolean;
  runtimeMinutes: number | null;
  collectionId: string | null;
  genres: string[];

  cast?: {
    personId: string;
    name: string;
    characterName: string | null;
    castOrder: number | null;
  }[];
  crew?: {
    personId: string;
    name: string;
    department: string | null;
    jobTitle: string | null;
  }[];
  companies?: {
    companyId: string;
    name: string;
    role: string | null;
  }[];
};

//function toJsValue(value: any) {
//  if (neo4j.isInt(value)) return value.toNumber();
  //return value ?? null;
//}

/**
 * Map Neo4j Movie node + genres into the canonical base MovieDto
 */
function mapNeoMovie(nodeProps: any, genres: string[]): MovieDto {
  return {
    mediaId: String(nodeProps.mediaId),
    tmdbId: String(nodeProps.tmdbId),
    mediaType: "movie",

    originalTitle: nodeProps.originalTitle ?? "",
    overview: nodeProps.overview ?? null,
    originalLanguage: nodeProps.originalLanguage ?? "",
    status: nodeProps.status ?? "",

    popularity: nodeProps.popularity != null ? Number(nodeProps.popularity) : null,
    voteAverage: Number(nodeProps.voteAverage ?? 0),
    voteCount: nodeProps.voteCount != null ? Number(nodeProps.voteCount) : null,

    releaseDate: nodeProps.releaseDate ?? null,

    budget: nodeProps.budget != null ? Number(nodeProps.budget) : null,
    revenue: nodeProps.revenue != null ? Number(nodeProps.revenue) : null,

    adultFlag: Boolean(nodeProps.adultFlag),
    runtimeMinutes: nodeProps.runtimeMinutes != null ? Number(nodeProps.runtimeMinutes) : null,

    collectionId: nodeProps.collectionId != null ? String(nodeProps.collectionId) : null,
    genres: genres ?? [],
  };
}

/**
 * Map Neo4j Movie summary for GET /neo/movies
 */
function mapNeoMovieSummary(nodeProps: any): any {
  return {
    mediaId: String(nodeProps.mediaId),
    originalTitle: nodeProps.originalTitle ?? "",
    voteAverage: Number(nodeProps.voteAverage ?? 0),
    genres: nodeProps.genres ?? [],
  };
}


   //GET /neo/movies (List/Search)
router.get("/", async (req, res) => {
  const session = getSession();

  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  try {
    let result;

    if (search.length > 0) {
      result = await session.run(
        `
        MATCH (mi:MediaItem {mediaType: "movie"})
        -[:IS_MOVIE]->(m:Movie)
        WHERE toLower(mi.originalTitle) CONTAINS toLower($search)
          OR toLower(mi.overview)      CONTAINS toLower($search)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS movie
        LIMIT $limit
        `,
        { search, limit: neo4j.int(limit) }
      );
    } else {
      result = await session.run(
        `
        MATCH (mi:MediaItem {mediaType: "movie"})
        -[:IS_MOVIE]->(m:Movie)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS movie
        LIMIT $limit
        `,
        { limit: neo4j.int(limit) }
      );
    }


    const movies = result.records.map((r) => {
      const props = r.get("movie");
      return mapNeoMovieSummary({
        ...props,
        genres: props.genres ?? [],
      });
    });

    res.json(movies);
  } catch (err) {
    console.error("Neo4j GET /movies error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});


   //GET /neo/movies/:id (Details)
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (mi:MediaItem {mediaId: $id, mediaType: "movie"})
      MATCH (mi)-[:IS_MOVIE]->(mov:Movie)

      // Genres from MediaItem
      OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
      WITH mi, mov, collect(g.name) AS genres

      // Companies
      OPTIONAL MATCH (mi)-[prod:PRODUCED_BY]->(c:Company)
      WITH mi, mov, genres,
          collect(
            CASE WHEN c IS NULL THEN null ELSE {
              companyId: c.companyId,
              name:     c.name,
              role:     prod.role
            } END
          ) AS companiesRaw

      // Cast: Actor -> MediaItem, with optional Person for name
      OPTIONAL MATCH (a:Actor)-[aRel:ACTED_IN]->(mi)
      OPTIONAL MATCH (a)-[:IS_ACTOR]->(p:Person)
      WITH mi, mov, genres, companiesRaw,
          collect(
            CASE WHEN aRel IS NULL THEN null ELSE {
              personId: coalesce(p.personId, a.personId),
              name:     coalesce(p.name, ""),
              characterName: aRel.characterName,
              castOrder:     aRel.castOrder
            } END
          ) AS castRaw

      // Crew: CrewMember -> MediaItem, with optional Person for name
      OPTIONAL MATCH (cm:CrewMember)-[w:WORKED_ON]->(mi)
      OPTIONAL MATCH (cm)-[:IS_CREW_MEMBER]->(p2:Person)
      WITH mi, mov, genres, companiesRaw, castRaw,
          collect(
            CASE WHEN w IS NULL THEN null ELSE {
              personId: coalesce(p2.personId, cm.personId),
              name:     coalesce(p2.name, ""),
              department: w.department,
              jobTitle:   w.jobTitle
            } END
          ) AS crewRaw

      // Collection (Movie -> Collection)
      OPTIONAL MATCH (mov)-[:PART_OF]->(col:Collection)
      WITH mi, mov, genres, companiesRaw, castRaw, crewRaw,
          col.collectionId AS collectionId

      RETURN mi, mov, genres,
            [c IN companiesRaw WHERE c IS NOT NULL] AS companies,
            [c IN castRaw      WHERE c IS NOT NULL] AS cast,
            [c IN crewRaw      WHERE c IS NOT NULL] AS crew,
            collectionId
      LIMIT 1
      `,
      { id }
    );


    if (result.records.length === 0) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const record = result.records[0]!;

    const mediaItemNode = (record.get("mi") as any)?.properties ?? {};
    const movieNode = (record.get("mov") as any)?.properties ?? {};
    const genres = (record.get("genres") as any[]) ?? [];
    const companies = ((record.get("companies") as any[]) ?? []).filter(c => c && c.companyId);
    const cast = ((record.get("cast") as any[]) ?? []).filter(c => c && c.personId);
    const crew = ((record.get("crew") as any[]) ?? []).filter(c => c && c.personId);
    const collectionId = record.get("collectionId") ?? null;

    // Merge MediaItem + Movie properties into one object for the mapper
    const combinedNode = {
      ...mediaItemNode,
      ...movieNode,
      collectionId,
    };

    const dto: MovieDto = {
      ...mapNeoMovie(combinedNode, genres),
      companies,
      cast,
      crew,
    };

    return res.json(dto);


  } catch (err) {
    console.error("Neo4j GET /movies/:id error:", err);
    return res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});


export default router;
