-- Clear all tables in correct order (child tables first)
DELETE FROM "TitleCrewAssignment";
DELETE FROM "EpisodeCrewAssignment";
DELETE FROM "EpisodeCasting";
DELETE FROM "TitleCasting";
DELETE FROM "MediaCompany";
DELETE FROM "MediaGenre";
DELETE FROM "CrewMember";
DELETE FROM "Actor";
DELETE FROM "Episode";
DELETE FROM "Season";
DELETE FROM "TVShow";
DELETE FROM "Movie";
DELETE FROM "MediaItem";
DELETE FROM "Person";
DELETE FROM "Company";
DELETE FROM "Collection";
DELETE FROM "Genre";

-- Reset auto-increment sequences
ALTER SEQUENCE IF EXISTS "Genre_genre_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "Collection_collection_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "Company_company_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "Person_person_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "MediaItem_media_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "Season_season_id_seq" RESTART WITH 1;
ALTER SEQUENCE IF EXISTS "Episode_episode_id_seq" RESTART WITH 1;