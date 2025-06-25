import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Crown, Trophy, Target, Upload, Library, Flame, TrendingUp, Shield, Star, Users, Award } from "lucide-react";

interface BadgeDisplayProps {
  badges: Array<{
    id: number;
    badgeType: string;
    badgeName: string;
    badgeDescription: string;
    iconName: string;
    earnedAt: string;
  }>;
  showAll?: boolean;
  limit?: number;
}

const iconMap = {
  crown: Crown,
  trophy: Trophy,
  target: Target,
  upload: Upload,
  library: Library,
  flame: Flame,
  "trending-up": TrendingUp,
  shield: Shield,
  star: Star,
  users: Users,
  award: Award,
};

const colorMap = {
  gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  green: "bg-green-100 text-green-800 border-green-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  pink: "bg-pink-100 text-pink-800 border-pink-300",
  red: "bg-red-100 text-red-800 border-red-300",
  default: "bg-gray-100 text-gray-800 border-gray-300",
};

export default function BadgeDisplay({ badges, showAll = false, limit = 3 }: BadgeDisplayProps) {
  const displayBadges = showAll ? badges : badges.slice(0, limit);
  const remainingCount = badges.length - limit;

  if (badges.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No badges earned yet
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {displayBadges.map((badge) => {
          const IconComponent = iconMap[badge.iconName as keyof typeof iconMap] || Award;
          const badgeColor = getBadgeColor(badge.badgeType);
          
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={`${colorMap[badgeColor]} flex items-center gap-1 px-2 py-1 text-xs font-medium border`}
                >
                  <IconComponent className="w-3 h-3" />
                  {badge.badgeName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">{badge.badgeName}</p>
                  <p className="text-sm text-gray-600">{badge.badgeDescription}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {!showAll && remainingCount > 0 && (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}

function getBadgeColor(badgeType: string): keyof typeof colorMap {
  const colorMapping: Record<string, keyof typeof colorMap> = {
    first_task: "green",
    task_master: "gold",
    seo_expert: "gold",
    first_document: "blue",
    knowledge_keeper: "purple",
    streak_warrior: "orange",
    rising_star: "pink",
    authority_figure: "red",
    review_expert: "blue",
    team_player: "purple",
  };
  
  return colorMapping[badgeType] || "default";
}