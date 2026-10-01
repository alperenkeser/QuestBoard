export interface User {
  id: string;
  username: string;
  totalXp: number;
  level: number;
  completedQuests: number;
  dailyCompletedTasks: number;
  dailyCompletedQuests: number;
  dailyEarnedXp: number;
  lastActiveDate: string | null;
  createdDate: string;
  updatedDate: string;
}
