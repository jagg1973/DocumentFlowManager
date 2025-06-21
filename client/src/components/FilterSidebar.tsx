import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FilterState } from "@/lib/types";
import { getPillarColor } from "@/lib/utils";

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  projectStats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
  } | null;
  members: Array<{
    id: number;
    userId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }> | undefined;
}

export default function FilterSidebar({ 
  filters, 
  onFiltersChange, 
  projectStats,
  members 
}: FilterSidebarProps) {
  const pillars = [
    { value: 'Technical', label: 'Technical SEO', color: 'pillar-technical' },
    { value: 'On-Page & Content', label: 'On-Page & Content', color: 'pillar-onpage' },
    { value: 'Off-Page', label: 'Off-Page SEO', color: 'pillar-offpage' },
    { value: 'Analytics', label: 'Analytics & Tracking', color: 'pillar-analytics' },
  ];

  const phases = [
    { value: '1: Foundation', label: '1: Foundation' },
    { value: '2: Growth', label: '2: Growth' },
    { value: '3: Authority', label: '3: Authority' },
  ];

  const handlePillarChange = (pillar: string, checked: boolean) => {
    const newPillars = new Set(filters.pillars);
    if (checked) {
      newPillars.add(pillar);
    } else {
      newPillars.delete(pillar);
    }
    onFiltersChange({ ...filters, pillars: newPillars });
  };

  const handlePhaseChange = (phase: string, checked: boolean) => {
    const newPhases = new Set(filters.phases);
    if (checked) {
      newPhases.add(phase);
    } else {
      newPhases.delete(phase);
    }
    onFiltersChange({ ...filters, phases: newPhases });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    const newAssignees = new Set(filters.assignees);
    if (assigneeId === "all") {
      newAssignees.clear();
    } else {
      newAssignees.clear();
      if (assigneeId !== "") {
        newAssignees.add(assigneeId);
      }
    }
    onFiltersChange({ ...filters, assignees: newAssignees });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      pillars: new Set(['Technical', 'On-Page & Content', 'Off-Page', 'Analytics']),
      phases: new Set(['1: Foundation', '2: Growth', '3: Authority']),
      assignees: new Set(),
      showCompleted: true,
    });
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clearAllFilters}
            className="text-sm text-primary hover:text-primary"
          >
            Clear All
          </Button>
        </div>

        {/* Pillar Filters */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">SEO Pillars</h3>
          <div className="space-y-3">
            {pillars.map((pillar) => (
              <div key={pillar.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`pillar-${pillar.value}`}
                  checked={filters.pillars.has(pillar.value)}
                  onCheckedChange={(checked) => 
                    handlePillarChange(pillar.value, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`pillar-${pillar.value}`}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <div className={`w-3 h-3 rounded ${getPillarColor(pillar.value)}`}></div>
                  <span className="text-sm text-gray-700">{pillar.label}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Filters */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">SEO Phases</h3>
          <div className="space-y-3">
            {phases.map((phase) => (
              <div key={phase.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`phase-${phase.value}`}
                  checked={filters.phases.has(phase.value)}
                  onCheckedChange={(checked) => 
                    handlePhaseChange(phase.value, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`phase-${phase.value}`}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {phase.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee Filter */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Assigned To</h3>
          <Select 
            value={filters.assignees.size === 0 ? "all" : Array.from(filters.assignees)[0] || ""}
            onValueChange={handleAssigneeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Team Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              <SelectItem value="">Unassigned</SelectItem>
              {members?.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.user.firstName} {member.user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Stats */}
        {projectStats && (
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                Project Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Tasks</span>
                <span className="font-medium">{projectStats.totalTasks}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Completed</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {projectStats.completedTasks}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">In Progress</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  {projectStats.inProgressTasks}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overdue</span>
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {projectStats.overdueTasks}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
