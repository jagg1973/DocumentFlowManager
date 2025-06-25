import { storage } from './storage';

// Experience point values for different activities
export const ACTIVITY_POINTS = {
  TASK_COMPLETED: 50,
  DOCUMENT_UPLOADED: 25,
  REVIEW_GIVEN: 30,
  REVIEW_RECEIVED_POSITIVE: 20,
  PROJECT_CREATED: 40,
  LOGIN_STREAK: 10,
  COMMENT_ADDED: 5,
  TASK_ITEM_COMPLETED: 15,
};

// Level calculation (exponential growth)
export function calculateLevel(experiencePoints: number): number {
  if (experiencePoints < 100) return 1;
  if (experiencePoints < 300) return 2;
  if (experiencePoints < 600) return 3;
  if (experiencePoints < 1000) return 4;
  if (experiencePoints < 1500) return 5;
  if (experiencePoints < 2100) return 6;
  if (experiencePoints < 2800) return 7;
  if (experiencePoints < 3600) return 8;
  if (experiencePoints < 4500) return 9;
  if (experiencePoints < 5500) return 10;
  
  // For levels above 10, each level requires 1000 more points
  return Math.floor((experiencePoints - 5500) / 1000) + 11;
}

// Badge definitions
export const BADGE_DEFINITIONS = [
  {
    name: "First Steps",
    description: "Complete your first task",
    iconName: "target",
    badgeColor: "green",
    requiredValue: 1,
    category: "tasks",
    badgeType: "first_task"
  },
  {
    name: "Task Master",
    description: "Complete 10 tasks",
    iconName: "trophy",
    badgeColor: "gold",
    requiredValue: 10,
    category: "tasks",
    badgeType: "task_master"
  },
  {
    name: "Document Contributor",
    description: "Upload your first document",
    iconName: "upload",
    badgeColor: "blue",
    requiredValue: 1,
    category: "documents",
    badgeType: "first_document"
  },
  {
    name: "Knowledge Keeper",
    description: "Upload 25 documents",
    iconName: "library",
    badgeColor: "purple",
    requiredValue: 25,
    category: "documents",
    badgeType: "knowledge_keeper"
  },
  {
    name: "Streak Warrior",
    description: "Maintain a 7-day login streak",
    iconName: "flame",
    badgeColor: "orange",
    requiredValue: 7,
    category: "streaks",
    badgeType: "streak_warrior"
  },
  {
    name: "Review Expert",
    description: "Give 20 task reviews",
    iconName: "star",
    badgeColor: "yellow",
    requiredValue: 20,
    category: "reviews",
    badgeType: "review_expert"
  },
  {
    name: "Team Player",
    description: "Be added to 5 projects",
    iconName: "users",
    badgeColor: "indigo",
    requiredValue: 5,
    category: "projects",
    badgeType: "team_player"
  },
  {
    name: "Rising Star",
    description: "Reach level 5",
    iconName: "trending-up",
    badgeColor: "pink",
    requiredValue: 5,
    category: "levels",
    badgeType: "rising_star"
  },
  {
    name: "SEO Expert",
    description: "Complete 50 tasks",
    iconName: "crown",
    badgeColor: "gold",
    requiredValue: 50,
    category: "tasks",
    badgeType: "seo_expert"
  },
  {
    name: "Authority Figure",
    description: "Reach 500+ authority score",
    iconName: "shield",
    badgeColor: "red",
    requiredValue: 500,
    category: "authority",
    badgeType: "authority_figure"
  }
];

// Check if user should receive new achievements
export async function checkAchievements(userId: string): Promise<void> {
  try {
    await storage.checkAndAwardAchievements(userId);
  } catch (error) {
    console.error('Error checking achievements for user:', userId, error);
  }
}

// Award experience points and update level
export async function awardExperience(userId: string, activityType: keyof typeof ACTIVITY_POINTS, relatedId?: number): Promise<void> {
  try {
    const points = ACTIVITY_POINTS[activityType];
    if (!points) return;

    await storage.logActivity(userId, activityType.toLowerCase(), points, relatedId);
    await storage.updateUserExperience(userId, points);
    await checkAchievements(userId);
  } catch (error) {
    console.error('Error awarding experience:', error);
  }
}

// Update user's daily streak
export async function updateStreak(userId: string): Promise<void> {
  try {
    await storage.updateUserStreak(userId);
    await checkAchievements(userId);
  } catch (error) {
    console.error('Error updating streak:', error);
  }
}