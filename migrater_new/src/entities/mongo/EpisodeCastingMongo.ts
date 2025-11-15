import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("episode_castings")
export class EpisodeCastingMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  castingId!: string;

  @Column()
  episodeId!: string;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  characterName?: string;

  @Column({ nullable: true })
  castOrder?: number;

  // Embedded episode data
  @Column({ nullable: true })
  episode?: any;

  // Embedded actor/person data
  @Column({ nullable: true })
  actor?: any;
}