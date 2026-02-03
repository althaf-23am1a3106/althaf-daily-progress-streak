import { useState } from 'react';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { TrackTabs } from '@/components/dashboard/TrackTabs';
import { QuoteSection } from '@/components/dashboard/QuoteSection';
import { DayDetailModal } from '@/components/dashboard/DayDetailModal';
import { AccessModal } from '@/components/dashboard/AccessModal';
import { AccessProvider, useAccess } from '@/contexts/AccessContext';
import { DayInfo, formatDateKey } from '@/lib/dateUtils';
import { TRACKS } from '@/lib/constants';
import { useEntries } from '@/hooks/useEntries';
import { Loader2 } from 'lucide-react';

function DashboardContent() {
  const { mode } = useAccess();
  const [activeTrack, setActiveTrack] = useState<string>(TRACKS.AIML.id);
  const [selectedDay, setSelectedDay] = useState<{ day: DayInfo; track: 'aiml' | 'dsa' } | null>(null);
  
  const { completedDates, entriesMap, loading, refetch } = useEntries();

  const handleDayClick = (day: DayInfo, track: string) => {
    setSelectedDay({ day, track: track as 'aiml' | 'dsa' });
  };

  const getCurrentEntry = () => {
    if (!selectedDay) return null;
    const { day, track } = selectedDay;
    const dateKey = formatDateKey(day.date);
    return entriesMap[track][dateKey] || null;
  };

  if (loading && mode !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AccessModal isOpen={mode === null} />
      
      <div className="container mx-auto px-4 pb-12">
        <HeroSection />
        
        <TrackTabs
          activeTrack={activeTrack}
          onTrackChange={setActiveTrack}
          completedDates={completedDates}
          onDayClick={handleDayClick}
        />

        <div className="mt-8">
          <QuoteSection />
        </div>
      </div>

      <DayDetailModal
        day={selectedDay?.day || null}
        entry={getCurrentEntry()}
        track={selectedDay?.track || 'aiml'}
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        onSaved={refetch}
      />
    </div>
  );
}

const Index = () => {
  return (
    <AccessProvider>
      <DashboardContent />
    </AccessProvider>
  );
};

export default Index;
