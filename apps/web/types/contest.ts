export type ContestStatus = "upcoming" | "ongoing" | "finished";
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
  isVirtual: boolean;
  organizer: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export type ParticipationStatus = "registered" | "not-registered";
