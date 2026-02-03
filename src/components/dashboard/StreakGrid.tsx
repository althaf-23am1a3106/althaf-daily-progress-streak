import { useMemo } from 'react';
import { DayBox } from './DayBox';
import { DayInfo, generateAllDays, formatDateKey, calculateStreak } from '@/lib/dateUtils';
import { DASHBOARD_CONFIG } from '@/lib/constants';
import { StatsBar } from './StatsBar';

interface StreakGridProps {
  completedDates: Set<string>;
  onDayClick: (day: DayInfo) => void;
}

export function StreakGrid({ completedDates, onDayClick }: StreakGridProps) {
  const days = useMemo(() => generateAllDays(completedDates), [completedDates]);
  
  const stats = useMemo(() => ({
    currentStreak: calculateStreak(completedDates),
    totalCompleted: completedDates.size,
    totalDays: DASHBOARD_CONFIG.totalDays,
  }), [completedDates]);

  // Group days by week (7 days per row)
  const weeks = useMemo(() => {
    const result: DayInfo[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  // Get month labels for the header
  const monthLabels = useMemo(() => {
    const labels: { month: string; startWeek: number }[] = [];
    let currentMonth = '';
    
    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0];
      const monthName = firstDayOfWeek.date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthName !== currentMonth) {
        labels.push({ month: monthName, startWeek: weekIndex });
        currentMonth = monthName;
      }
    });
    
    return labels;
  }, [weeks]);

  return (
    <div className="space-y-4">
      <StatsBar {...stats} />
      
      <div className="glass-card rounded-xl p-4 md:p-6 overflow-x-auto">
        {/* Month labels */}
        <div className="flex gap-1 mb-2 text-xs text-muted-foreground pl-0">
          {monthLabels.map(({ month, startWeek }, index) => {
            const nextStart = monthLabels[index + 1]?.startWeek ?? weeks.length;
            const width = (nextStart - startWeek) * 18; // Approximate width per week
            return (
              <div
                key={`${month}-${startWeek}`}
                style={{ minWidth: `${width}px` }}
                className="truncate"
              >
                {month}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day) => (
                <DayBox
                  key={formatDateKey(day.date)}
                  day={day}
                  onClick={() => onDayClick(day)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm streak-empty" />
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/60" />
            <div className="w-3 h-3 rounded-sm streak-completed" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
