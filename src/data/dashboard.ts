export type Activity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: "lesson" | "quiz" | "tutor" | "streak";
};

export const recentActivity: Activity[] = [];

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export const achievements: Achievement[] = [];

export type Task = {
  id: string;
  title: string;
  subject: string;
  due: string;
  type: "quiz" | "lesson" | "revision";
};

export const upcomingTasks: Task[] = [];

export const weeklyStudy: { day: string; minutes: number }[] = [];

export const quizPerformance: { subject: string; score: number }[] = [];

export const studyStats = {
  streak: 0,
  dailyGoalMinutes: 0,
  minutesToday: 0,
  lessonsCompleted: 0,
  totalLessons: 0,
  hoursThisWeek: 0,
};
