-- Inserts realistic test data for the Movie/TV database
-- (SQL seed active)
/*INSERT INTO "Genre" ("name") VALUES
('Action'),('Drama'),('Comedy'),('Thriller'),
('Science Fiction'),('Fantasy'),('Documentary'),
('Romance'),('Horror'),('Animation')
ON CONFLICT DO NOTHING;

INSERT INTO "Company" ("tmdb_id","name","origin_country","description","logo_path") VALUES
(1001,'Paramount Pictures','US','Major film studio','/logos/paramount.png'),
(1002,'Warner Bros.','US','Entertainment company','/logos/warner.png'),
(1003,'BBC Studios','GB','Public broadcaster','/logos/bbc.png'),
(1004,'Studio Ghibli','JP','Japanese animation studio','/logos/ghibli.png'),
(1005,'Netflix','US','Streaming platform','/logos/netflix.png')
ON CONFLICT DO NOTHING;

INSERT INTO "Collection" ("tmdb_id","name","overview","poster_path","backdrop_path") VALUES
(2001,'The Matrix Collection','Science fiction series','/posters/matrix.jpg','/backdrops/matrix.jpg'),
(2002,'Toy Story Collection','Animated movie franchise','/posters/toystory.jpg','/backdrops/toystory.jpg')
ON CONFLICT DO NOTHING;

INSERT INTO "Person" ("tmdb_id","name","gender","biography","birth_date","place_of_birth","profile_path") VALUES
(3001,'Keanu Reeves',2,'Actor','1964-09-02','Beirut, Lebanon','/profiles/keanu.jpg'),
(3002,'Carrie-Anne Moss',1,'Actress','1967-08-21','Burnaby, Canada','/profiles/carrie.jpg'),
(3003,'Lana Wachowski',2,'Director','1965-06-21','Chicago, USA','/profiles/lana.jpg'),
(3004,'Tom Hanks',2,'Actor','1956-07-09','Concord, USA','/profiles/hanks.jpg'),
(3005,'Tim Allen',2,'Actor','1953-06-13','Denver, USA','/profiles/tim.jpg'),
(3006,'Hayao Miyazaki',2,'Animator','1941-01-05','Tokyo, Japan','/profiles/miyazaki.jpg'),
(3007,'Emma Watson',1,'Actress','1990-04-15','Paris, France','/profiles/emma.jpg'),
(3008,'Christopher Nolan',2,'Director','1970-07-30','London, UK','/profiles/nolan.jpg'),
(3009,'Morgan Freeman',2,'Actor','1937-06-01','Memphis, USA','/profiles/freeman.jpg'),
(3010,'Scarlett Johansson',1,'Actress','1984-11-22','New York, USA','/profiles/scarlett.jpg')
ON CONFLICT DO NOTHING;

INSERT INTO "Actor" ("person_id","acting_debut_year") VALUES
(1,1985),(2,1990),(4,1977),(5,1980),(7,2001),(9,1964),(10,1994)
ON CONFLICT DO NOTHING;

INSERT INTO "CrewMember" ("person_id","primary_department") VALUES
(3,'Directing'),(6,'Animation'),(8,'Directing')
ON CONFLICT DO NOTHING;

INSERT INTO "MediaItem" ("tmdb_id","media_type","original_title","overview","original_language","status","popularity","vote_average","vote_count","poster_path","backdrop_path","homepage_url") VALUES
(4001,'movie','The Matrix','A hacker discovers reality is a simulation.','en','Released',95.5,8.7,15000,'/posters/matrix.jpg','/backdrops/matrix_bg.jpg','https://thematrix.com'),
(4002,'movie','Toy Story','Toys come to life when humans are not around.','en','Released',88.2,8.3,12000,'/posters/toystory.jpg','/backdrops/toystory_bg.jpg','https://toystory.com'),
(4003,'tv','Planet Earth','A nature documentary series.','en','Ended',70.1,9.5,5000,'/posters/planetearth.jpg','/backdrops/planetearth_bg.jpg','https://bbc.co.uk/planetearth'),
(4004,'tv','Stranger Things','Kids uncover supernatural events in a small town.','en','Ongoing',92.8,8.9,18000,'/posters/strangerthings.jpg','/backdrops/strangerthings_bg.jpg','https://netflix.com/strangerthings')
ON CONFLICT DO NOTHING;

INSERT INTO "Movie" ("media_id","release_date","budget","revenue","adult_flag","runtime_minutes","collection_id") VALUES
(1,'1999-03-31',63000000,466000000,false,136,1),
(2,'1995-11-22',30000000,373000000,false,81,2)
ON CONFLICT DO NOTHING;

INSERT INTO "TVShow" ("media_id","first_air_date","last_air_date","in_production","number_of_seasons","number_of_episodes","show_type") VALUES
(3,'2006-03-05','2006-12-10',false,1,11,'Documentary'),
(4,'2016-07-15',NULL,true,4,34,'Science Fiction')
ON CONFLICT DO NOTHING;

INSERT INTO "Season" ("tv_media_id","season_number","name","air_date","episode_count","poster_path") VALUES
(3,1,'Season 1','2006-03-05',11,'/posters/planetearth_s1.jpg'),
(4,1,'Season 1','2016-07-15',8,'/posters/strangerthings_s1.jpg'),
(4,2,'Season 2','2017-10-27',9,'/posters/strangerthings_s2.jpg')
ON CONFLICT DO NOTHING;

INSERT INTO "Episode" ("season_id","episode_number","name","air_date","runtime_minutes","overview","still_path") VALUES
(1,1,'From Pole to Pole','2006-03-05',55,'Exploring the planet from pole to pole.','/stills/planetearth_e1.jpg'),
(2,1,'Chapter One','2016-07-15',50,'The disappearance of a boy leads to supernatural events.','/stills/st_e1.jpg')
ON CONFLICT DO NOTHING;

INSERT INTO "MediaGenre" ("media_id","genre_id") VALUES
(1,1),(1,5),(2,3),(2,10),(3,7),(4,1),(4,5),(4,4)
ON CONFLICT DO NOTHING;

INSERT INTO "MediaCompany" ("media_id","company_id","role") VALUES
(1,2,'production'),
(2,1,'production'),
(3,3,'production'),
(4,5,'network')
ON CONFLICT DO NOTHING;

INSERT INTO "TitleCasting" ("media_id","person_id","character_name","cast_order") VALUES
(1,1,'Neo',1),
(1,2,'Trinity',2),
(2,4,'Woody',1),
(2,5,'Buzz Lightyear',2)
ON CONFLICT DO NOTHING;

INSERT INTO "EpisodeCasting" ("episode_id","person_id","character_name","cast_order") VALUES
(1,9,'Narrator',1),
(2,7,'Eleven',1),
(2,10,'Joyce Byers',2)
ON CONFLICT DO NOTHING;

INSERT INTO "TitleCrewAssignment" ("media_id","person_id","department","job_title") VALUES
(1,3,'Directing','Director'),
(2,6,'Animation','Director'),
(4,8,'Directing','Director')
ON CONFLICT DO NOTHING;

INSERT INTO "EpisodeCrewAssignment" ("episode_id","person_id","department","job_title") VALUES
(1,3,'Production','Series Director'),
(2,8,'Production','Executive Producer')
ON CONFLICT DO NOTHING;

-- Optional: create an example app user if pgcrypto is available (dev only)
DO $$ BEGIN
	BEGIN
		CREATE EXTENSION IF NOT EXISTS pgcrypto;
	EXCEPTION WHEN others THEN
		RAISE NOTICE 'pgcrypto not available, skipping extension creation';
	END;
END $$;

INSERT INTO "UserAccount" (username, password_hash, role)
SELECT 'devadmin', crypt('devpassword', gen_salt('bf')), 'admin'
WHERE NOT EXISTS (SELECT 1 FROM "UserAccount" WHERE username = 'devadmin');
