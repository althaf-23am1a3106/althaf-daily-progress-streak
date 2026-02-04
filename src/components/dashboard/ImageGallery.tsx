import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ProofImage, uploadImage, deleteImage, fetchEntryImages } from '@/lib/api';
import { Image as ImageIcon, Plus, X, Loader2, ZoomIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface ImageGalleryProps {
  entryId?: string;
  images: ProofImage[];
  isEditing: boolean;
  onImagesChange: (images: ProofImage[]) => void;
}

export function ImageGallery({ entryId, images, isEditing, onImagesChange }: ImageGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ProofImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const token = sessionStorage.getItem('ownerToken');
    if (!token) {
      toast({
        title: 'Session Expired',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    if (!entryId) {
      toast({
        title: 'Save Entry First',
        description: 'Please save the entry before uploading images.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid File',
            description: `${file.name} is not an image.`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: `${file.name} exceeds 5MB limit.`,
            variant: 'destructive',
          });
          continue;
        }

        const result = await uploadImage(token, entryId, file);
        if (result.success && result.image) {
          // Refresh images from server
          const updatedImages = await fetchEntryImages(entryId);
          onImagesChange(updatedImages);
          toast({
            title: 'Uploaded!',
            description: `${file.name} uploaded successfully.`,
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image.';
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    const token = sessionStorage.getItem('ownerToken');
    if (!token) {
      toast({
        title: 'Session Expired',
        description: 'Please log in again.',
        variant: 'destructive',
      });
      return;
    }

    setDeletingId(imageId);
    
    try {
      await deleteImage(token, imageId);
      onImagesChange(images.filter(img => img.id !== imageId));
      toast({
        title: 'Deleted!',
        description: 'Image removed successfully.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete image.';
      toast({
        title: 'Delete Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Screenshots & Proof
      </label>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((image) => (
            <div key={image.id} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={image.url}
                alt={image.file_name}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => setPreviewImage(image)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {isEditing && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.id);
                  }}
                  disabled={deletingId === image.id}
                >
                  {deletingId === image.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {isEditing ? 'No images uploaded yet' : 'No images uploaded'}
        </p>
      )}

      {isEditing && entryId && (
        <div className="mt-3">
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> Add Images</>
            )}
          </Button>
        </div>
      )}

      {isEditing && !entryId && (
        <p className="text-muted-foreground text-xs mt-2">
          Save the entry first to upload images
        </p>
      )}

      {/* Image Preview Modal */}
      <Dialog open={previewImage !== null} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewImage && (
            <img
              src={previewImage.url}
              alt={previewImage.file_name}
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
