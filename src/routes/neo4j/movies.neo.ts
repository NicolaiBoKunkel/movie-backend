import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j from "neo4j-driver";

const router = Router();


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

  posterPath: string | null;
  backdropPath: string | null;
  homepageUrl: string | null;

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


function toJs(value: any) {
  return neo4j.isInt(value) ? value.toNumber() : value ?? null;
}


function mapNeoMovie(nodeProps: any, genres: string[]): MovieDto {
  return {
    mediaId: String(nodeProps.mediaId),
    tmdbId: String(nodeProps.tmdbId),
    mediaType: "movie",

    originalTitle: nodeProps.originalTitle ?? "",
    overview: nodeProps.overview ?? null,
    originalLanguage: nodeProps.originalLanguage ?? "",
    status: nodeProps.status ?? "",

    popularity:
      nodeProps.popularity != null ? Number(toJs(nodeProps.popularity)) : null,
    voteAverage: Number(nodeProps.voteAverage ?? 0),
    voteCount:
      nodeProps.voteCount != null ? Number(toJs(nodeProps.voteCount)) : null,

    releaseDate:
      nodeProps.releaseDate ? String(nodeProps.releaseDate).slice(0, 10) : null,

    budget:
      nodeProps.budget != null ? Number(toJs(nodeProps.budget)) : null,
    revenue:
      nodeProps.revenue != null ? Number(toJs(nodeProps.revenue)) : null,

    adultFlag: Boolean(nodeProps.adultFlag),
    runtimeMinutes:
      nodeProps.runtimeMinutes != null
        ? Number(toJs(nodeProps.runtimeMinutes))
        : null,

    collectionId:
      nodeProps.collectionId != null ? String(nodeProps.collectionId) : null,

    posterPath: nodeProps.posterPath ?? null,
    backdropPath: nodeProps.backdropPath ?? null,
    homepageUrl: nodeProps.homepageUrl ?? null,

    genres: (genres ?? []).filter((g) => g != null),
  };
}


function mapNeoMovieSummary(nodeProps: any) {
  return {
    mediaId: String(nodeProps.mediaId),
    originalTitle: nodeProps.originalTitle ?? "",
    voteAverage: Number(nodeProps.voteAverage ?? 0),
    genres: (nodeProps.genres ?? []).filter((g: any) => g != null),
    posterPath: nodeProps.posterPath ?? null,
    backdropPath: nodeProps.backdropPath ?? null,
  };
}


router.get("/", async (req, res) => {
  const session = getSession();

  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  try {
    let result;

    if (search.length > 0) {
      result = await session.run(
        `
        MATCH (mi:MediaItem {mediaType: "movie"})-[:IS_MOVIE]->(:Movie)
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
        MATCH (mi:MediaItem {mediaType: "movie"})-[:IS_MOVIE]->(:Movie)
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
      return mapNeoMovieSummary({ ...props });
    });

    res.json(movies);
  } catch (err) {
    console.error("Neo4j GET /movies error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});


router.get("/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Invalid ID" });

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (mi:MediaItem {mediaId: $id, mediaType: "movie"})
      MATCH (mi)-[:IS_MOVIE]->(mov:Movie)

      OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
      WITH mi, mov, collect(g.name) AS genres

      OPTIONAL MATCH (mi)-[prod:PRODUCED_BY]->(c:Company)
      WITH mi, mov, genres,
           collect(
             CASE WHEN c IS NULL THEN null ELSE {
               companyId: c.companyId,
               name: c.name,
               role: prod.role
             } END
           ) AS companiesRaw

      OPTIONAL MATCH (a:Actor)-[aRel:ACTED_IN]->(mi)
      OPTIONAL MATCH (a)<-[:IS_ACTOR]-(p:Person)
      WITH mi, mov, genres, companiesRaw,
           collect(
             CASE WHEN aRel IS NULL THEN null ELSE {
               personId: coalesce(p.personId, a.personId),
               name: coalesce(p.name, ""),
               characterName: aRel.characterName,
               castOrder: aRel.castOrder
             } END
           ) AS castRaw

      OPTIONAL MATCH (cm:CrewMember)-[w:WORKED_ON]->(mi)
      OPTIONAL MATCH (cm)<-[:IS_CREW_MEMBER]-(p2:Person)
      WITH mi, mov, genres, companiesRaw, castRaw,
           collect(
             CASE WHEN w IS NULL THEN null ELSE {
               personId: coalesce(p2.personId, cm.personId),
               name: coalesce(p2.name, ""),
               department: w.department,
               jobTitle: w.jobTitle
             } END
           ) AS crewRaw

      OPTIONAL MATCH (mov)-[:PART_OF]->(col:Collection)
      WITH mi, mov, genres, companiesRaw, castRaw, crewRaw,
           col.collectionId AS collectionId

      RETURN mi, mov, genres,
             [x IN companiesRaw WHERE x IS NOT NULL] AS companies,
             [x IN castRaw      WHERE x IS NOT NULL] AS cast,
             [x IN crewRaw      WHERE x IS NOT NULL] AS crew,
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
    const companies = (record.get("companies") as any[]) ?? [];
    const cast = (record.get("cast") as any[]) ?? [];
    const crew = (record.get("crew") as any[]) ?? [];
    const collectionId = record.get("collectionId") ?? null;

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
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

router.get("/:id/related", async (req, res) => {
  const id = String(req.params.id);
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);

  const session = getSession();

  try {
    const result = await session.run(
      `
      MATCH (mi:MediaItem {mediaId: $id, mediaType: "movie"})
      MATCH (a:Actor)-[:ACTED_IN]->(mi)
      MATCH (a)-[:ACTED_IN]->(other:MediaItem {mediaType: "movie"})
      WHERE other.mediaId <> $id
      WITH other, COUNT(DISTINCT a) AS shared_cast_count
      RETURN
        other.mediaId AS media_id,
        other.originalTitle AS original_title,
        shared_cast_count
      ORDER BY shared_cast_count DESC, media_id ASC
      LIMIT $limit
      `,
      { id, limit: neo4j.int(limit) }
    );

    const rows = result.records.map((r) => ({
      media_id: String(r.get("media_id")),
      original_title: r.get("original_title") ?? null,
      shared_cast_count: Number(toJs(r.get("shared_cast_count"))),
    }));

    return res.json(rows);
  } catch (err) {
    console.error("Neo4j GET /neo/movies/:id/related error:", err);
    return res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});


export default router;
