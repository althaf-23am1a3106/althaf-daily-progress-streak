import { useState, useEffect, useCallback } from 'react';
import { 
  DailyEntry, 
  fetchAllEntries, 
  subscribeToEntries 
} from '@/lib/api';

interface UseEntriesResult {
  entries: DailyEntry[];
  completedDates: {
    aiml: Set<string>;
    dsa: Set<string>;
  };
  entriesMap: {
    aiml: Record<string, DailyEntry>;
    dsa: Record<string, DailyEntry>;
  };
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useEntries(): UseEntriesResult {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllEntries();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();

    // Subscribe to realtime updates
    const channel = subscribeToEntries((payload) => {
      if (payload.eventType === 'INSERT') {
        setEntries(prev => [...prev, payload.new as DailyEntry]);
      } else if (payload.eventType === 'UPDATE') {
        setEntries(prev => 
          prev.map(e => e.id === payload.new.id ? payload.new as DailyEntry : e)
        );
      } else if (payload.eventType === 'DELETE') {
        setEntries(prev => prev.filter(e => e.id !== payload.old.id));
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [loadEntries]);

  // Compute completed dates and entries map
  const completedDates = {
    aiml: new Set<string>(),
    dsa: new Set<string>(),
  };

  const entriesMap: {
    aiml: Record<string, DailyEntry>;
    dsa: Record<string, DailyEntry>;
  } = {
    aiml: {},
    dsa: {},
  };

  entries.forEach(entry => {
    if (entry.is_completed) {
      completedDates[entry.track].add(entry.entry_date);
    }
    entriesMap[entry.track][entry.entry_date] = entry;
  });

  return {
    entries,
    completedDates,
    entriesMap,
    loading,
    error,
    refetch: loadEntries,
  };
}
