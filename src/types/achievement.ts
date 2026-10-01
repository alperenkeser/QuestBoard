export interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  unlocked: boolean;
  unlockedDate: string | null;
}
