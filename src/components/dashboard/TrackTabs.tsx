import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TRACKS } from '@/lib/constants';
import { StreakGrid } from './StreakGrid';
import { DayInfo } from '@/lib/dateUtils';

interface TrackTabsProps {
  activeTrack: string;
  onTrackChange: (track: string) => void;
  completedDates: {
    aiml: Set<string>;
    dsa: Set<string>;
  };
  onDayClick: (day: DayInfo, track: string) => void;
}

export function TrackTabs({ activeTrack, onTrackChange, completedDates, onDayClick }: TrackTabsProps) {
  return (
    <Tabs value={activeTrack} onValueChange={onTrackChange} className="w-full">
      <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 glass-card mb-6">
        <TabsTrigger
          value={TRACKS.AIML.id}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <span className="mr-2">{TRACKS.AIML.icon}</span>
          {TRACKS.AIML.name}
        </TabsTrigger>
        <TabsTrigger
          value={TRACKS.DSA.id}
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <span className="mr-2">{TRACKS.DSA.icon}</span>
          {TRACKS.DSA.name}
        </TabsTrigger>
      </TabsList>

      <TabsContent value={TRACKS.AIML.id} className="mt-0">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {TRACKS.AIML.icon} {TRACKS.AIML.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Building expertise in AI & Machine Learning
          </p>
        </div>
        <StreakGrid
          completedDates={completedDates.aiml}
          onDayClick={(day) => onDayClick(day, TRACKS.AIML.id)}
        />
      </TabsContent>

      <TabsContent value={TRACKS.DSA.id} className="mt-0">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {TRACKS.DSA.icon} {TRACKS.DSA.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Mastering algorithms and problem-solving
          </p>
        </div>
        <StreakGrid
          completedDates={completedDates.dsa}
          onDayClick={(day) => onDayClick(day, TRACKS.DSA.id)}
        />
      </TabsContent>
    </Tabs>
  );
}
