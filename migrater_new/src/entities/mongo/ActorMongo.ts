import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("actors")
export class ActorMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  actingDebutYear?: number;

  // Embedded person data
  @Column()
  person!: any;

  // Title castings (movies/TV shows)
  @Column({ type: "array", default: [] })
  titleRoles!: any[];

  // Episode castings
  @Column({ type: "array", default: [] })
  episodeRoles!: any[];
}