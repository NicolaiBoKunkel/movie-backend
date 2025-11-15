import { DataSource } from "typeorm";
import { MediaItemMongo } from "./entities/mongo/MediaItemMongo";
import { MovieMongo } from "./entities/mongo/MovieMongo";
import { TVShowMongo } from "./entities/mongo/TVShowMongo";
import { PersonMongo } from "./entities/mongo/PersonMongo";
import { CompanyMongo } from "./entities/mongo/CompanyMongo";
import { GenreMongo } from "./entities/mongo/GenreMongo";
import { SeasonMongo } from "./entities/mongo/SeasonMongo";
import { EpisodeMongo } from "./entities/mongo/EpisodeMongo";
import { ActorMongo } from "./entities/mongo/ActorMongo";
import { CrewMemberMongo } from "./entities/mongo/CrewMemberMongo";
import { CollectionMongo } from "./entities/mongo/CollectionMongo";
import { MediaGenreMongo } from "./entities/mongo/MediaGenreMongo";
import { MediaCompanyMongo } from "./entities/mongo/MediaCompanyMongo";
import { TitleCastingMongo } from "./entities/mongo/TitleCastingMongo";
import { EpisodeCastingMongo } from "./entities/mongo/EpisodeCastingMongo";
import { TitleCrewAssignmentMongo } from "./entities/mongo/TitleCrewAssignmentMongo";
import { EpisodeCrewAssignmentMongo } from "./entities/mongo/EpisodeCrewAssignmentMongo";

const MongoDataSource = new DataSource({
  type: "mongodb",
  url: process.env.MONGODB_URI || "mongodb://localhost:27017/movie_db_mongo",
  entities: [
    MediaItemMongo,
    MovieMongo,
    TVShowMongo,
    PersonMongo,
    CompanyMongo,
    GenreMongo,
    SeasonMongo,
    EpisodeMongo,
    ActorMongo,
    CrewMemberMongo,
    CollectionMongo,
    MediaGenreMongo,
    MediaCompanyMongo,
    TitleCastingMongo,
    EpisodeCastingMongo,
    TitleCrewAssignmentMongo,
    EpisodeCrewAssignmentMongo
  ],
  synchronize: true,
  logging: false,
});

export default MongoDataSource;