import { Router } from "express";
import { getSession } from "../../db/neo4j";
import neo4j, { Node, Record as NeoRecord } from "neo4j-driver";

const router = Router();


function toJs(value: any) {
  return neo4j.isInt(value) ? value.toNumber() : value ?? null;
}

function normalize(date: any) {
  return date ? String(date).substring(0, 10) : null;
}

function mapNeoTvSummary(props: any) {
  return {
    mediaId: String(props.mediaId),
    originalTitle: props.originalTitle ?? "",
    voteAverage: Number(props.voteAverage ?? 0),
    genres: props.genres ?? [],
    posterPath: props.posterPath ?? null,
    backdropPath: props.backdropPath ?? null,
  };
}


router.get("/", async (req, res) => {
  const session = getSession();
  const search = (req.query.search as string)?.trim() ?? "";
  const limit = Math.min(Number(req.query.limit) || 25, 100);

  try {
    let cypher = "";
    const params: any = { limit: neo4j.int(limit) };

    if (search.length > 0) {
      cypher = `
        MATCH (mi:MediaItem {mediaType: "tv"})-[:IS_TV_SHOW]->(t:TVShow)
        WHERE toLower(mi.originalTitle) CONTAINS toLower($search)
           OR toLower(mi.overview)      CONTAINS toLower($search)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS show
        LIMIT $limit
      `;
      params.search = search;
    } else {
      cypher = `
        MATCH (mi:MediaItem {mediaType: "tv"})-[:IS_TV_SHOW]->(t:TVShow)
        OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
        WITH mi, collect(g.name) AS genres
        RETURN mi {.*, genres: genres} AS show
        LIMIT $limit
      `;
    }

    const result = await session.run(cypher, params);

    res.json(
      result.records.map((r: NeoRecord) => mapNeoTvSummary(r.get("show")))
    );
  } catch (err) {
    console.error("Neo4j GET /tv error:", err);
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
      MATCH (mi:MediaItem {mediaId: $id, mediaType: "tv"})
      MATCH (mi)-[:IS_TV_SHOW]->(t:TVShow)

      OPTIONAL MATCH (mi)-[:HAS_GENRE]->(g:Genre)
      WITH mi, t, collect(g.name) AS genres

      OPTIONAL MATCH (mi)-[prod:PRODUCED_BY]->(c:Company)
      WITH mi, t, genres,
           collect(
             CASE WHEN c IS NULL THEN null ELSE {
               companyId: c.companyId,
               name:     c.name,
               role:     prod.role
             } END
           ) AS companiesRaw

      OPTIONAL MATCH (a:Actor)-[aRel:ACTED_IN]->(mi)
      OPTIONAL MATCH (a)<-[:IS_ACTOR]-(p:Person)
      WITH mi, t, genres, companiesRaw,
           collect(
             CASE WHEN aRel IS NULL THEN null ELSE {
               personId: coalesce(p.personId, a.personId),
               name:     coalesce(p.name, ""),
               characterName: aRel.characterName,
               castOrder:     aRel.castOrder
             } END
           ) AS castRaw

      OPTIONAL MATCH (cm:CrewMember)-[w:WORKED_ON]->(mi)
      OPTIONAL MATCH (cm)<-[:IS_CREW_MEMBER]-(p2:Person)
      WITH mi, t, genres, companiesRaw, castRaw,
           collect(
             CASE WHEN w IS NULL THEN null ELSE {
               personId: coalesce(p2.personId, cm.personId),
               name:     coalesce(p2.name, ""),
               department: w.department,
               jobTitle:   w.jobTitle
             } END
           ) AS crewRaw

      OPTIONAL MATCH (t)-[:HAS_SEASON]->(s:Season)
      WITH mi, t, genres, companiesRaw, castRaw, crewRaw, collect(s) AS seasonsRaw

      RETURN mi, t, genres,
             [x IN companiesRaw WHERE x IS NOT NULL] AS companies,
             [x IN castRaw      WHERE x IS NOT NULL] AS cast,
             [x IN crewRaw      WHERE x IS NOT NULL] AS crew,
             seasonsRaw
      LIMIT 1
      `,
      { id }
    );

    if (result.records.length === 0)
      return res.status(404).json({ error: "TV show not found" });

    const rec = result.records[0]!;

    const mi = rec.get("mi").properties;
    const t = rec.get("t").properties;

    const genres = rec.get("genres") ?? [];
    const companies = rec.get("companies") ?? [];
    const cast = rec.get("cast") ?? [];
    const crew = rec.get("crew") ?? [];
    const seasonsRaw: Node[] = rec.get("seasonsRaw") ?? [];

    const seasons: any[] = [];

    for (const sNode of seasonsRaw) {
      const sProps = sNode.properties;
      const sid = String(sProps.seasonId);

      const epRes = await session.run(
        `
        MATCH (s:Season {seasonId: $sid})
        OPTIONAL MATCH (s)-[:HAS_EPISODE]->(e:Episode)
        RETURN collect(e) AS eps
        `,
        { sid }
      );

      const eps: Node[] = epRes.records[0]?.get("eps") ?? [];

      const episodes = eps.map((e) => {
        const p = e.properties;
        return {
          episodeId: String(p.episodeId),
          episodeNumber: Number(toJs(p.episodeNumber)),
          name: p.name ?? null,
          airDate: normalize(p.airDate),
          runtimeMinutes: toJs(p.runtimeMinutes),
          overview: p.overview ?? null,
          stillPath: p.stillPath ?? null,
        };
      });

      seasons.push({
        seasonNumber: Number(toJs(sProps.seasonNumber)),
        name: sProps.name ?? null,
        airDate: normalize(sProps.airDate),
        episodeCount: episodes.length,
        posterPath: sProps.posterPath ?? null,
        episodes,
      });
    }

    const dto = {
      mediaId: String(mi.mediaId),
      tmdbId: String(mi.tmdbId),
      mediaType: "tv",
      originalTitle: mi.originalTitle ?? "",
      overview: mi.overview ?? null,
      originalLanguage: mi.originalLanguage ?? "",
      status: mi.status ?? "",
      popularity: mi.popularity != null ? Number(toJs(mi.popularity)) : null,
      voteAverage: Number(mi.voteAverage ?? 0),
      voteCount: mi.voteCount ?? null,
      firstAirDate: normalize(t.firstAirDate),
      lastAirDate: normalize(t.lastAirDate),
      inProduction: Boolean(t.inProduction),
      numberOfSeasons: t.numberOfSeasons ?? seasons.length,
      numberOfEpisodes:
        t.numberOfEpisodes ??
        seasons.reduce((acc, s) => acc + (s.episodeCount || 0), 0),
      showType: t.showType ?? null,
      posterPath: mi.posterPath ?? null,
      backdropPath: mi.backdropPath ?? null,
      homepageUrl: mi.homepageUrl ?? null,
      genres,
      companies,
      cast,
      crew,
      seasons,
    };

    res.json(dto);
  } catch (err) {
    console.error("Neo4j GET /tv/:id error:", err);
    res.status(500).json({ error: "Neo4j query failed" });
  } finally {
    await session.close();
  }
});

export default router;
