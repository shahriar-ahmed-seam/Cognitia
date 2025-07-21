export type ContestStatus = "UPCOMING" | "ONGOING" | "FINISHED";
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
  organizer: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export type ParticipationStatus = "registered" | "not-registered";
