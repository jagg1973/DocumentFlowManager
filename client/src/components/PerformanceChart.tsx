import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap, Clock, Award } from "lucide-react";

interface PerformanceData {
  experienceHistory: Array<{ date: string; experience: number; level: number; }>;
  taskCompletionRate: Array<{ month: string; completed: number; assigned: number; rate: number; }>;
  skillDistribution: Array<{ skill: string; value: number; color: string; }>;
  timeTracking: Array<{ period: string; hoursSpent: number; tasksCompleted: number; efficiency: number; }>;
  weeklyActivity: Array<{ day: string; tasks: number; documents: number; reviews: number; }>;
  radarData: Array<{ subject: string; A: number; B: number; fullMark: 100; }>;
}

interface PerformanceChartProps {
  data: PerformanceData;
  userId: string;
  timeRange: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function PerformanceChart({ data, userId, timeRange }: PerformanceChartProps) {
  const currentExperience = data.experienceHistory[data.experienceHistory.length - 1]?.experience || 0;
  const previousExperience = data.experienceHistory[data.experienceHistory.length - 2]?.experience || 0;
  const experienceGrowth = currentExperience - previousExperience;
  const growthPercentage = previousExperience > 0 ? ((experienceGrowth / previousExperience) * 100).toFixed(1) : '0';

  const averageCompletionRate = data.taskCompletionRate.reduce((acc, item) => acc + item.rate, 0) / data.taskCompletionRate.length;
  const totalTasksCompleted = data.taskCompletionRate.reduce((acc, item) => acc + item.completed, 0);

  return (
    <div className="space-y-6">
      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Experience Growth</p>
                <p className="text-2xl font-bold specular-highlight">{experienceGrowth > 0 ? '+' : ''}{experienceGrowth}</p>
                <div className="flex items-center mt-1">
                  {experienceGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className="text-xs text-gray-500">{growthPercentage}% vs last period</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold specular-highlight">{averageCompletionRate.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  <Target className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-gray-500">{totalTasksCompleted} tasks done</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Efficiency</p>
                <p className="text-2xl font-bold specular-highlight">
                  {(data.timeTracking.reduce((acc, item) => acc + item.efficiency, 0) / data.timeTracking.length).toFixed(1)}
                </p>
                <div className="flex items-center mt-1">
                  <Clock className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-xs text-gray-500">tasks/hour</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card liquid-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Score</p>
                <p className="text-2xl font-bold specular-highlight">
                  {Math.round((averageCompletionRate + (experienceGrowth / 10)) / 2)}
                </p>
                <div className="flex items-center mt-1">
                  <Award className="w-4 h-4 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-500">out of 100</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Experience Growth Over Time */}
        <Card className="glass-card liquid-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Experience Growth ({timeRange})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.experienceHistory}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="experience" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="level" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Completion Trends */}
        <Card className="glass-card liquid-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Task Completion Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.taskCompletionRate}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="assigned" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Activity Pattern */}
        <Card className="glass-card liquid-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Weekly Activity Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Bar dataKey="tasks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="documents" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="reviews" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Distribution */}
        <Card className="glass-card liquid-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Skill Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.skillDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.skillDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {data.skillDistribution.map((skill, index) => (
                <Badge 
                  key={skill.skill} 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: COLORS[index % COLORS.length] }}
                >
                  {skill.skill} ({skill.value}%)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Radar Chart */}
      <Card className="glass-card liquid-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Performance Radar Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" className="text-sm" />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                className="text-xs"
                tick={false}
              />
              <Radar
                name="Current Performance"
                dataKey="A"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Target Performance"
                dataKey="B"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Current Performance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded border-2 border-dashed border-green-500"></div>
              <span className="text-sm text-gray-600">Target Performance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}