import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("seasons")
export class SeasonMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  seasonId!: string;

  @Column()
  tvMediaId!: string;

  @Column()
  seasonNumber!: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  airDate?: Date;

  @Column()
  episodeCount!: number;

  @Column({ nullable: true })
  posterPath?: string;

  // Embedded TV show data
  @Column({ nullable: true })
  tvShow?: any;

  // Embedded episodes
  @Column({ type: "array", default: [] })
  episodes!: any[];
}