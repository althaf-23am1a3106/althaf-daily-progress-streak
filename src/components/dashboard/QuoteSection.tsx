import { useMemo } from 'react';
import { MOTIVATIONAL_QUOTES } from '@/lib/constants';
import { Quote } from 'lucide-react';

export function QuoteSection() {
  const quote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  }, []);

  return (
    <div className="glass-card rounded-xl p-6 md:p-8 text-center">
      <Quote className="h-8 w-8 text-primary/40 mx-auto mb-4" />
      <blockquote className="text-lg md:text-xl text-foreground italic mb-3">
        "{quote.quote}"
      </blockquote>
      <cite className="text-sm text-muted-foreground not-italic">
        — {quote.author}
      </cite>
    </div>
  );
}
