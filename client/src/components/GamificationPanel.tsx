import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, TrendingUp, Flame, Users, Calendar, Star, Award } from "lucide-react";
import BadgeDisplay from "@/components/ui/badge-display";
import LevelProgress from "@/components/ui/level-progress";
import { useAuth } from "@/hooks/use-auth";

interface UserStats {
  experiencePoints: number;
  currentLevel: number;
  totalBadges: number;
  streakDays: number;
  tasksCompleted: number;
  averageRating: string;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    experiencePoints: number;
    currentLevel: number;
  };
  score: number;
}

export default function GamificationPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch user badges
  const { data: badges = [] } = useQuery({
    queryKey: ["/api/gamification/badges", user?.id],
    enabled: !!user?.id,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["/api/gamification/stats", user?.id],
    enabled: !!user?.id,
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["/api/gamification/leaderboard", "overall"],
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery({
    queryKey: ["/api/gamification/activity", user?.id],
    enabled: !!user?.id,
  });

  if (!user) return null;

  const stats: UserStats = {
    experiencePoints: userStats?.experiencePoints || user.experiencePoints || 0,
    currentLevel: userStats?.currentLevel || user.currentLevel || 1,
    totalBadges: userStats?.totalBadges || user.totalBadges || 0,
    streakDays: userStats?.streakDays || user.streakDays || 0,
    tasksCompleted: userStats?.tasksCompleted || user.tasksCompleted || 0,
    averageRating: userStats?.averageRating || user.averageRating || "0.00",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level Card */}
        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Level</p>
                  <p className="text-xl font-bold specular-highlight">{stats.currentLevel}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{stats.experiencePoints.toLocaleString()} XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Card */}
        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Badges</p>
                  <p className="text-xl font-bold specular-highlight">{stats.totalBadges}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Streak</p>
                  <p className="text-xl font-bold specular-highlight">{stats.streakDays} days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tasks</p>
                  <p className="text-xl font-bold specular-highlight">{stats.tasksCompleted}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <LevelProgress 
            currentLevel={stats.currentLevel}
            experiencePoints={stats.experiencePoints}
            showDetailed={true}
          />
          
          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                Recent Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDisplay badges={badges} limit={6} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle>All Badges ({badges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDisplay badges={badges} showAll={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                  <div key={entry.user.id} className="flex items-center justify-between p-3 rounded-lg bg-white/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                        'bg-gradient-to-r from-blue-400 to-blue-600'
                      }`}>
                        {entry.rank}
                      </div>
                      <div>
                        <p className="font-medium">{entry.user.firstName} {entry.user.lastName}</p>
                        <p className="text-sm text-gray-600">Level {entry.user.currentLevel}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{entry.score.toLocaleString()} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="glass-card liquid-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white/20">
                      <div>
                        <p className="font-medium capitalize">{activity.activityType.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(activity.activityDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        +{activity.pointsEarned} XP
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}