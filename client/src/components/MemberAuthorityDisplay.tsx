import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Award, TrendingUp } from "lucide-react";

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
    enabled: !!userId,
  });

  const getAuthorityLevel = (score: number) => {
    if (score >= 1000) return { level: "Expert", color: "bg-purple-500", icon: Award };
    if (score >= 500) return { level: "Advanced", color: "bg-blue-500", icon: TrendingUp };
    if (score >= 100) return { level: "Intermediate", color: "bg-green-500", icon: Star };
    return { level: "Beginner", color: "bg-gray-500", icon: Star };
  };

  const score = authorityData?.authorityScore || 0;
  const authority = getAuthorityLevel(score);
  const IconComponent = authority.icon;

  if (showDetailed) {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={userImage || undefined} />
            <AvatarFallback>
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900">{userName}</h3>
            <div className="flex items-center space-x-2">
              <Badge className={`${authority.color} text-white`}>
                <IconComponent className="w-3 h-3 mr-1" />
                {authority.level}
              </Badge>
              <span className="text-sm text-gray-600">MA: {score}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Authority Score</span>
            <span className="font-semibold">{score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${authority.color}`}
              style={{ width: `${Math.min((score / 1000) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Based on task completion quality, peer reviews, and expertise demonstration
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={userImage || undefined} />
              <AvatarFallback className="text-xs">
                {userName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Badge variant="outline" className={`${authority.color} text-white border-0`}>
              <IconComponent className="w-3 h-3 mr-1" />
              {authority.level}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{userName}</p>
            <p className="text-sm">Authority Score: {score}</p>
            <p className="text-xs text-gray-400">Level: {authority.level}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}