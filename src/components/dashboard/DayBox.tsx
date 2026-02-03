import { DayInfo } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface DayBoxProps {
  day: DayInfo;
  onClick: () => void;
}

export function DayBox({ day, onClick }: DayBoxProps) {
  const getStatusClasses = () => {
    switch (day.status) {
      case 'completed':
        return 'streak-completed cursor-pointer hover:scale-110';
      case 'today':
        return 'streak-empty streak-today cursor-pointer hover:scale-110 animate-glow-pulse';
      case 'empty':
        return 'streak-empty cursor-pointer hover:scale-105 hover:border-primary/50';
      case 'future':
        return 'streak-future cursor-not-allowed';
      default:
        return '';
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={day.status !== 'future' ? onClick : undefined}
        disabled={day.status === 'future'}
        className={cn(
          'w-3.5 h-3.5 md:w-4 md:h-4 rounded-sm transition-all duration-200',
          getStatusClasses()
        )}
        aria-label={`Day ${day.dayNumber}: ${day.status}`}
      />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-popover text-popover-foreground text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg border border-border">
        <div className="font-medium">
          {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
        <div className="text-muted-foreground capitalize">{day.status}</div>
      </div>
    </div>
  );
}
