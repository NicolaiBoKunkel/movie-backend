import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("media_items")
export class MediaItemMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  mediaId!: string;

  @Column({ nullable: true })
  tmdbId?: string;

  @Column()
  mediaType!: string;

  @Column()
  originalTitle!: string;

  @Column({ nullable: true })
  overview?: string;

  @Column({ nullable: true })
  originalLanguage?: string;

  @Column({ nullable: true })
  status?: string;

  @Column()
  popularity!: number;

  @Column()
  voteAverage!: number;

  @Column()
  voteCount!: number;

  @Column({ nullable: true })
  posterPath?: string;

  @Column({ nullable: true })
  backdropPath?: string;

  @Column({ nullable: true })
  homepageUrl?: string;

  // Embedded related data
  @Column({ nullable: true })
  movie?: any;

  @Column({ nullable: true })
  tvShow?: any;

  @Column({ type: "array", default: [] })
  genres!: any[];

  @Column({ type: "array", default: [] })
  companies!: any[];

  @Column({ type: "array", default: [] })
  cast!: any[];

  @Column({ type: "array", default: [] })
  crew!: any[];
}