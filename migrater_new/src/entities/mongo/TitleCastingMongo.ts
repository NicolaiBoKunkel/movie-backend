import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("title_castings")
export class TitleCastingMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  castingId!: string;

  @Column()
  mediaId!: string;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  characterName?: string;

  @Column({ nullable: true })
  castOrder?: number;

  // Embedded media item data
  @Column({ nullable: true })
  mediaItem?: any;

  // Embedded actor/person data
  @Column({ nullable: true })
  actor?: any;
}