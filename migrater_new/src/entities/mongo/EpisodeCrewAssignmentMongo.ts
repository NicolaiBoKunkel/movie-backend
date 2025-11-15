import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("episode_crew_assignments")
export class EpisodeCrewAssignmentMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  crewAssignmentId!: string;

  @Column()
  episodeId!: string;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  jobTitle?: string;

  // Embedded episode data
  @Column({ nullable: true })
  episode?: any;

  // Embedded crew member/person data
  @Column({ nullable: true })
  crewMember?: any;
}