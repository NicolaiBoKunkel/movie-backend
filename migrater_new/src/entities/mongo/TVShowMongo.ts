import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("tv_shows")
export class TVShowMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  mediaId!: string;

  @Column({ nullable: true })
  firstAirDate?: Date;

  @Column({ nullable: true })
  lastAirDate?: Date;

  @Column()
  inProduction!: boolean;

  @Column()
  numberOfSeasons!: number;

  @Column()
  numberOfEpisodes!: number;

  @Column({ nullable: true })
  showType?: string;

  // Embedded seasons with episodes
  @Column({ type: "array", default: [] })
  seasons!: any[];

  // Embedded media item data
  @Column()
  mediaItem!: any;
}