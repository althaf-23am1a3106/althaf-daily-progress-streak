import { useState } from 'react';
import { DASHBOARD_CONFIG, PHILOSOPHY_TEXT } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAccess } from '@/contexts/AccessContext';

export function HeroSection() {
  const [showPhilosophy, setShowPhilosophy] = useState(false);
  const { mode, logout, isOwner } = useAccess();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="text-center py-8 md:py-12 px-4">
      <div className="flex justify-end mb-4">
        {mode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isOwner ? '🔐 Owner Mode' : '👁️ Viewer Mode'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Exit
            </Button>
          </div>
        )}
      </div>

      <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-4 animate-fade-in-up">
        365 Days of Discipline
      </h1>
      
      <p className="text-lg md:text-xl text-muted-foreground mb-2">
        {DASHBOARD_CONFIG.owner.tagline}
      </p>
      
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
        <span>{formatDate(DASHBOARD_CONFIG.startDate)}</span>
        <span className="text-primary">→</span>
        <span>{formatDate(DASHBOARD_CONFIG.endDate)}</span>
      </div>

      <Button
        variant="ghost"
        onClick={() => setShowPhilosophy(true)}
        className="text-primary hover:text-primary/80 group"
      >
        Read my philosophy on consistency
        <ChevronDown className="ml-1 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
      </Button>

      <Dialog open={showPhilosophy} onOpenChange={setShowPhilosophy}>
        <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gradient text-2xl">
              The Philosophy of Consistency
            </DialogTitle>
            <DialogDescription className="sr-only">
              My personal philosophy on building consistency through daily practice
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
            {PHILOSOPHY_TEXT.split('\n\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
