import { DASHBOARD_CONFIG } from './constants';

export type DayStatus = 'completed' | 'empty' | 'today' | 'future';

export interface DayInfo {
  date: Date;
  dayNumber: number;
  status: DayStatus;
  isToday: boolean;
  isFuture: boolean;
  monthLabel?: string;
}

export function getDayStatus(date: Date, isCompleted: boolean, today: Date): DayStatus {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (dateOnly > todayOnly) return 'future';
  if (dateOnly.getTime() === todayOnly.getTime()) return 'today';
  if (isCompleted) return 'completed';
  return 'empty';
}

export function generateAllDays(completedDates: Set<string>): DayInfo[] {
  const days: DayInfo[] = [];
  const today = new Date();
  const { startDate, totalDays } = DASHBOARD_CONFIG;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dateKey = formatDateKey(date);
    const isCompleted = completedDates.has(dateKey);
    const status = getDayStatus(date, isCompleted, today);

    const dayInfo: DayInfo = {
      date,
      dayNumber: i + 1,
      status,
      isToday: status === 'today',
      isFuture: status === 'future',
    };

    // Add month label for first day of each month or first day
    if (i === 0 || date.getDate() === 1) {
      dayInfo.monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    }

    days.push(dayInfo);
  }

  return days;
}

export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function calculateStreak(completedDates: Set<string>): number {
  const today = new Date();
  const todayKey = formatDateKey(today);
  
  let streak = 0;
  let checkDate = new Date(today);

  // If today is not completed, start from yesterday
  if (!completedDates.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (completedDates.has(formatDateKey(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Don't count before start date
    if (checkDate < DASHBOARD_CONFIG.startDate) break;
  }

  return streak;
}

export function getEarnedMilestones(totalCompleted: number, milestones: { days: number; label: string; icon: string }[]) {
  return milestones.filter(m => totalCompleted >= m.days);
}
