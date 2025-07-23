export type ContestStatus = "UPCOMING" | "ONGOING" | "FINISHED" | "DRAFT";
export type ContestDifficulty = "easy" | "medium" | "hard" | "expert";

export interface Contest {
  id: string;
  title: string;
  description: string;
  status: ContestStatus;
  difficulty: ContestDifficulty;
  startTime: string;
  endTime: string;
  topics: string[];
  participants: number;
  createdBy?: string;
  organizer?: {
    id?: string;
    name?: string;
    avatar?: string;
  };
  eligibility?: string;
}

export type ParticipationStatus = "registered" | "not-registered";
