import { MILESTONES } from '@/lib/constants';
import { getEarnedMilestones } from '@/lib/dateUtils';
import { Flame, CheckCircle, TrendingUp } from 'lucide-react';

interface StatsBarProps {
  currentStreak: number;
  totalCompleted: number;
  totalDays: number;
}

export function StatsBar({ currentStreak, totalCompleted, totalDays }: StatsBarProps) {
  const completionPercentage = Math.round((totalCompleted / totalDays) * 100);
  const earnedMilestones = getEarnedMilestones(totalCompleted, MILESTONES);

  return (
    <div className="glass-card rounded-xl p-4 md:p-6 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 glow-primary">
            <Flame className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Day Streak</p>
          </div>
        </div>

        {/* Total Completed */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{totalCompleted}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Days Done</p>
          </div>
        </div>

        {/* Completion Percentage */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-12 h-12 md:w-14 md:h-14 -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="20"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <circle
                cx="50%"
                cy="50%"
                r="20"
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth="4"
                strokeDasharray={`${completionPercentage * 1.26} 126`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-foreground">{completionPercentage}%</p>
            <p className="text-xs md:text-sm text-muted-foreground">Complete</p>
          </div>
        </div>

        {/* Milestones */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            {earnedMilestones.slice(-3).map((milestone, i) => (
              <span
                key={milestone.days}
                className="text-xl md:text-2xl"
                title={milestone.label}
                style={{ zIndex: earnedMilestones.length - i }}
              >
                {milestone.icon}
              </span>
            ))}
            {earnedMilestones.length === 0 && (
              <span className="text-xl md:text-2xl opacity-30">🌱</span>
            )}
          </div>
          <div>
            <p className="text-lg md:text-xl font-bold text-foreground">
              {earnedMilestones.length}/{MILESTONES.length}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Milestones</p>
          </div>
        </div>
      </div>
    </div>
  );
}
