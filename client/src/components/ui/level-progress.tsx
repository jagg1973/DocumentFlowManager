import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Zap } from "lucide-react";

interface LevelProgressProps {
  currentLevel: number;
  experiencePoints: number;
  showDetailed?: boolean;
}

function calculateLevelProgress(level: number, currentExp: number) {
  // Calculate experience needed for current level and next level
  const expForCurrentLevel = getExpRequiredForLevel(level);
  const expForNextLevel = getExpRequiredForLevel(level + 1);
  
  const progressExp = currentExp - expForCurrentLevel;
  const requiredExp = expForNextLevel - expForCurrentLevel;
  const progressPercentage = Math.min((progressExp / requiredExp) * 100, 100);
  
  return {
    progressExp,
    requiredExp,
    progressPercentage,
    expForNextLevel
  };
}

function getExpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 300;
  if (level === 4) return 600;
  if (level === 5) return 1000;
  if (level === 6) return 1500;
  if (level === 7) return 2100;
  if (level === 8) return 2800;
  if (level === 9) return 3600;
  if (level === 10) return 4500;
  if (level === 11) return 5500;
  
  // For levels above 11, each level requires 1000 more points
  return 5500 + ((level - 11) * 1000);
}

export default function LevelProgress({ currentLevel, experiencePoints, showDetailed = true }: LevelProgressProps) {
  const { progressExp, requiredExp, progressPercentage } = calculateLevelProgress(currentLevel, experiencePoints);

  if (!showDetailed) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="font-medium text-sm">Level {currentLevel}</span>
        </div>
        <div className="flex-1 max-w-20">
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg specular-highlight">Level {currentLevel}</h3>
              <p className="text-sm text-gray-600">{experiencePoints.toLocaleString()} XP</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Progress to Level {currentLevel + 1}</div>
            <div className="text-lg font-bold text-blue-600">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{progressExp.toLocaleString()} XP</span>
            <span>{requiredExp.toLocaleString()} XP needed</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>
        
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
          <Zap className="w-4 h-4 text-blue-500" />
          <span>Complete tasks and activities to gain XP</span>
        </div>
      </CardContent>
    </Card>
  );
}