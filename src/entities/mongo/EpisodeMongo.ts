import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("episodes")
export class EpisodeMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  episodeId!: string;

  @Column()
  seasonId!: string;

  @Column()
  episodeNumber!: number;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  airDate?: Date;

  @Column({ nullable: true })
  runtimeMinutes?: number;

  @Column({ nullable: true })
  overview?: string;

  @Column({ nullable: true })
  stillPath?: string;

  // Embedded season data
  @Column({ nullable: true })
  season?: any;

  // Embedded cast and crew
  @Column({ type: "array", default: [] })
  cast!: any[];

  @Column({ type: "array", default: [] })
  crew!: any[];
}