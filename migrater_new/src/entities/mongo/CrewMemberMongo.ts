import { Entity, ObjectIdColumn, ObjectId, Column } from "typeorm";

@Entity("crew_members")
export class CrewMemberMongo {
  @ObjectIdColumn()
  _id?: ObjectId;

  @Column()
  personId!: string;

  @Column({ nullable: true })
  primaryDepartment?: string;

  // Embedded person data
  @Column()
  person!: any;

  // Title crew assignments (movies/TV shows)
  @Column({ type: "array", default: [] })
  titleAssignments!: any[];

  // Episode crew assignments
  @Column({ type: "array", default: [] })
  episodeAssignments!: any[];
}