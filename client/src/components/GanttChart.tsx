import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskWithUser } from "@/lib/types";
import { Task } from "@shared/schema";
import { getPillarColor, getPhaseColor, formatDate, calculateDatePosition, generateTimelineWeeks } from "@/lib/utils";

interface GanttChartProps {
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  selectedTask: Task | null;
}

export default function GanttChart({ tasks, onTaskSelect, selectedTask }: GanttChartProps) {
  // Calculate timeline range
  const { timelineStart, timelineEnd, timelineWeeks } = useMemo(() => {
    if (tasks.length === 0) {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      return {
        timelineStart: start,
        timelineEnd: end,
        timelineWeeks: generateTimelineWeeks(start, end),
      };
    }

    const dates = tasks
      .filter(task => task.startDate && task.endDate)
      .flatMap(task => [new Date(task.startDate!), new Date(task.endDate!)]);

    if (dates.length === 0) {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      return {
        timelineStart: start,
        timelineEnd: end,
        timelineWeeks: generateTimelineWeeks(start, end),
      };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add some padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    return {
      timelineStart: minDate,
      timelineEnd: maxDate,
      timelineWeeks: generateTimelineWeeks(minDate, maxDate),
    };
  }, [tasks]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Timeline Header */}
      <div className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
        <div className="flex">
          <div className="w-80 px-6 py-3 border-r border-gray-200">
            <span className="text-sm font-medium text-gray-700">Task Name</span>
          </div>
          <div className="flex-1 gantt-grid">
            <div className="flex h-12">
              {timelineWeeks.map((week, index) => (
                <div 
                  key={index} 
                  className="min-w-[100px] border-r border-gray-200 px-2 py-3 text-center"
                >
                  <div className="text-xs font-medium text-gray-500">
                    {week.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                  <div className="text-xs text-gray-700">
                    {week.getDate()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-sm">Add some tasks to see them on the timeline.</p>
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className={`border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                selectedTask?.id === task.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => onTaskSelect(task)}
            >
              <div className="flex items-center">
                {/* Task Info */}
                <div className="w-80 px-6 py-4 border-r border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded ${getPillarColor(task.pillar)} flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.taskName}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        {task.phase && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getPhaseColor(task.phase)}`}
                          >
                            {task.phase.replace(/^\d+:\s*/, '')}
                          </Badge>
                        )}
                        {task.assignedToId && (
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-xs">
                              {task.assignedToId.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gantt Bar */}
                <div className="flex-1 gantt-grid relative py-4 min-h-[60px]">
                  {task.startDate && task.endDate && (
                    <div 
                      className={`gantt-task ${getPillarColor(task.pillar)} absolute top-1/2 transform -translate-y-1/2`}
                      style={{
                        ...calculateDatePosition(task.startDate, task.endDate, timelineStart, timelineEnd),
                        left: `${calculateDatePosition(task.startDate, task.endDate, timelineStart, timelineEnd).left}%`,
                        width: `${Math.max(calculateDatePosition(task.startDate, task.endDate, timelineStart, timelineEnd).width, 5)}%`,
                      }}
                    >
                      <span className="truncate text-xs font-medium">
                        {task.taskName.length > 15 ? task.taskName.substring(0, 15) + '...' : task.taskName}
                      </span>
                      {task.progress && task.progress > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-60 rounded-b"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
