import { DataSource } from "typeorm";
import { MovieMongo } from "../entities/mongo/MovieMongo";
import { MediaItemMongo } from "../entities/mongo/MediaItemMongo";
import { TVShowMongo } from "../entities/mongo/TVShowMongo";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://root:password@localhost:27018/movie_db_mongo?authSource=admin";

export const MongoDataSource = new DataSource({
  type: "mongodb",
  url: mongoUri,
  entities: [
    MovieMongo,
    MediaItemMongo,
    TVShowMongo
  ],
  synchronize: false,
  logging: true,
});

export default MongoDataSource;
