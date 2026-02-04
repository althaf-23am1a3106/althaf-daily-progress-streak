import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DayInfo, formatDisplayDate, formatDateKey } from '@/lib/dateUtils';
import { useAccess } from '@/contexts/AccessContext';
import { saveEntry, EntryFormData, DailyEntry } from '@/lib/api';
import { CheckCircle, Circle, Link as LinkIcon, Image as ImageIcon, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DayDetailModalProps {
  day: DayInfo | null;
  entry: DailyEntry | null;
  track: 'aiml' | 'dsa';
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function DayDetailModal({ day, entry, track, isOpen, onClose, onSaved }: DayDetailModalProps) {
  const { isOwner } = useAccess();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EntryFormData>({
    description: '',
    learnings: '',
    links: [],
    images: [],
    isCompleted: false,
  });
  const [newLink, setNewLink] = useState('');

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      setFormData({
        description: entry.description || '',
        learnings: entry.learnings || '',
        links: entry.links || [],
        images: [],
        isCompleted: entry.is_completed,
      });
    } else {
      setFormData({
        description: '',
        learnings: '',
        links: [],
        images: [],
        isCompleted: false,
      });
    }
    setEditMode(false);
  }, [entry, isOpen]);

  if (!day) return null;

  const handleSave = async () => {
    const token = sessionStorage.getItem('ownerToken');
    if (!token) {
      toast({
        title: 'Session Expired',
        description: 'Please log in again to continue.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await saveEntry(token, track, formatDateKey(day.date), formData);
      toast({
        title: 'Saved!',
        description: 'Entry updated successfully.',
      });
      setEditMode(false);
      onSaved();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save entry.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddLink = () => {
    if (newLink.trim()) {
      setFormData(prev => ({
        ...prev,
        links: [...prev.links, newLink.trim()],
      }));
      setNewLink('');
    }
  };

  const handleRemoveLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const toggleComplete = () => {
    setFormData(prev => ({
      ...prev,
      isCompleted: !prev.isCompleted,
    }));
  };

  const displayData = editMode ? formData : {
    description: entry?.description || '',
    learnings: entry?.learnings || '',
    links: entry?.links || [],
    images: [],
    isCompleted: entry?.is_completed || false,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {formatDisplayDate(day.date)}
            </DialogTitle>
            <Badge
              variant={displayData.isCompleted ? 'default' : 'secondary'}
              className={displayData.isCompleted ? 'bg-primary' : ''}
            >
              {displayData.isCompleted ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Completed</>
              ) : (
                <><Circle className="h-3 w-3 mr-1" /> Not Completed</>
              )}
            </Badge>
          </div>
          <DialogDescription>
            Day {day.dayNumber} of 365 • {track.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              What did you work on?
            </label>
            {editMode ? (
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your work for today..."
                className="min-h-[100px] bg-muted/50"
              />
            ) : (
              <p className="text-muted-foreground">
                {displayData.description || 'No activity recorded'}
              </p>
            )}
          </div>

          {/* Learnings */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Key Learnings
            </label>
            {editMode ? (
              <Textarea
                value={formData.learnings}
                onChange={(e) => setFormData(prev => ({ ...prev, learnings: e.target.value }))}
                placeholder="What did you learn today?"
                className="min-h-[80px] bg-muted/50"
              />
            ) : (
              <p className="text-muted-foreground">
                {displayData.learnings || 'No learnings recorded'}
              </p>
            )}
          </div>

          {/* Links */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Proof Links
            </label>
            <div className="space-y-2">
              {displayData.links.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm truncate flex-1"
                  >
                    {link}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                  {editMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLink(index)}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {editMode && (
                <div className="flex gap-2">
                  <Input
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://github.com/..."
                    className="bg-muted/50"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                  />
                  <Button variant="outline" size="icon" onClick={handleAddLink}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!editMode && displayData.links.length === 0 && (
                <p className="text-muted-foreground text-sm">No links added</p>
              )}
            </div>
          </div>

          {/* Images placeholder */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Screenshots & Proof
            </label>
            <p className="text-muted-foreground text-sm">
              {editMode ? 'Image upload coming soon...' : 'No images uploaded'}
            </p>
          </div>

          {/* Actions */}
          {isOwner && day.status !== 'future' && (
            <div className="flex justify-between items-center pt-4 border-t border-border">
              {editMode ? (
                <>
                  <Button
                    variant={formData.isCompleted ? 'default' : 'outline'}
                    onClick={toggleComplete}
                    className={formData.isCompleted ? 'bg-primary' : ''}
                  >
                    {formData.isCompleted ? (
                      <><CheckCircle className="h-4 w-4 mr-2" /> Completed</>
                    ) : (
                      <><Circle className="h-4 w-4 mr-2" /> Mark Complete</>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setEditMode(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)}>
                  Edit Entry
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
