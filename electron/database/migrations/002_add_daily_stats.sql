-- Adds daily-reset gamification counters to users. Combined with the existing
-- lastActiveDate column (now used as a YYYY-MM-DD day stamp), the repository
-- resets these to 0 whenever it detects the stored day differs from today.
ALTER TABLE users ADD COLUMN dailyCompletedQuests INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN dailyEarnedXp INTEGER NOT NULL DEFAULT 0;
