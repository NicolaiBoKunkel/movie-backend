import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("title_crew_assignments")
export class TitleCrewAssignmentMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  crewAssignmentId!: string;

  @Column()
  mediaId!: string;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  jobTitle?: string;

  // Embedded media item data
  @Column({ nullable: true })
  mediaItem?: any;

  // Embedded crew member/person data
  @Column({ nullable: true })
  crewMember?: any;
}