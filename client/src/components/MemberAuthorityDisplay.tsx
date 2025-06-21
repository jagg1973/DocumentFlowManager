import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, TrendingUp, Award, Shield, Target } from "lucide-react";

interface MemberAuthorityDisplayProps {
  userId: string;
  userName: string;
  userImage?: string | null;
  showDetailed?: boolean;
}

export default function MemberAuthorityDisplay({ 
  userId, 
  userName, 
  userImage,
  showDetailed = false 
}: MemberAuthorityDisplayProps) {
  const { data: authorityData } = useQuery({
    queryKey: [`/api/users/${userId}/authority`],
  });

  if (!authorityData) {
    return null;
  }

  const getMemberLevelColor = (level: string) => {
    switch (level) {
      case "C-Level": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Manager": return "bg-blue-100 text-blue-800 border-blue-200";
      case "SEO Lead": return "bg-green-100 text-green-800 border-green-200";
      case "SEO Specialist": return "bg-orange-100 text-orange-800 border-orange-200";
      case "Junior": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Intern": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getMemberLevelIcon = (level: string) => {
    switch (level) {
      case "C-Level": return <Award className="w-4 h-4" />;
      case "Manager": return <Shield className="w-4 h-4" />;
      case "SEO Lead": return <Target className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  if (!showDetailed) {
    return (
      <div className="flex items-center space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={userImage || undefined} />
          <AvatarFallback>
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">{userName}</span>
          <Badge className={`${getMemberLevelColor(authorityData.memberLevel)} flex items-center space-x-1`}>
            {getMemberLevelIcon(authorityData.memberLevel)}
            <span>{authorityData.memberLevel}</span>
          </Badge>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600">MA:</span>
            <span className="text-sm font-semibold text-blue-600">{authorityData.memberAuthority}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="glass-card liquid-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={userImage || undefined} />
            <AvatarFallback>
              {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="specular-highlight">{userName}</h3>
            <Badge className={`${getMemberLevelColor(authorityData.memberLevel)} flex items-center space-x-1 mt-1`}>
              {getMemberLevelIcon(authorityData.memberLevel)}
              <span>{authorityData.memberLevel}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Member Authority Score */}
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {authorityData.memberAuthority}
          </div>
          <div className="text-sm text-gray-600">Member Authority (MA)</div>
          <div className="text-xs text-gray-500">
            Calculated: {authorityData.calculatedScore}
          </div>
        </div>

        {/* E-E-A-T Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">E-E-A-T Metrics</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Experience</span>
              <span className="text-sm font-medium">{authorityData.experienceScore}/100</span>
            </div>
            <Progress value={authorityData.experienceScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Expertise</span>
              <span className="text-sm font-medium">{authorityData.expertiseScore}/100</span>
            </div>
            <Progress value={authorityData.expertiseScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Authority</span>
              <span className="text-sm font-medium">{authorityData.authorityScore}/100</span>
            </div>
            <Progress value={authorityData.authorityScore} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Trustworthiness</span>
              <span className="text-sm font-medium">{authorityData.trustScore}/100</span>
            </div>
            <Progress value={authorityData.trustScore} className="h-2" />
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {authorityData.tasksCompleted}
            </div>
            <div className="text-xs text-gray-600">Tasks Completed</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-lg font-semibold text-gray-900">
                {parseFloat(authorityData.averageRating).toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-gray-600">Average Rating</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}