import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccess } from '@/contexts/AccessContext';
import { checkOwnerSetup, setupOwnerPassword, verifyOwnerPassword } from '@/lib/api';
import { Eye, Lock, ArrowLeft, Loader2 } from 'lucide-react';

interface AccessModalProps {
  isOpen: boolean;
}

export function AccessModal({ isOpen }: AccessModalProps) {
  const { setMode } = useAccess();
  const [view, setView] = useState<'choose' | 'login' | 'setup'>('choose');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);

  const handleViewerAccess = () => {
    setMode('viewer');
  };

  const handleOwnerClick = async () => {
    setCheckingSetup(true);
    try {
      const isFirstTime = await checkOwnerSetup();
      setView(isFirstTime ? 'setup' : 'login');
    } catch (err) {
      setError('Failed to check setup status');
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    
    try {
      const isValid = await verifyOwnerPassword(password);
      if (isValid) {
        sessionStorage.setItem('ownerPassword', password);
        setMode('owner');
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const success = await setupOwnerPassword(password);
      if (success) {
        sessionStorage.setItem('ownerPassword', password);
        setMode('owner');
      } else {
        setError('Failed to set up password');
      }
    } catch (err) {
      setError('Failed to set up password');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('choose');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="glass-card sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-gradient">
            {view === 'choose' && 'Welcome to the Dashboard'}
            {view === 'login' && 'Owner Login'}
            {view === 'setup' && 'Set Up Owner Access'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {view === 'choose' && 'How would you like to access this dashboard?'}
            {view === 'login' && 'Enter your password to access owner mode'}
            {view === 'setup' && 'Create a password to protect owner access'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {view === 'choose' && (
            <>
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/10"
                onClick={handleViewerAccess}
              >
                <Eye className="h-6 w-6 text-primary" />
                <div>
                  <div className="font-medium">View as Guest</div>
                  <div className="text-xs text-muted-foreground">Browse the dashboard (read-only)</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-accent hover:bg-accent/10"
                onClick={handleOwnerClick}
                disabled={checkingSetup}
              >
                {checkingSetup ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Lock className="h-6 w-6 text-accent" />
                )}
                <div>
                  <div className="font-medium">Owner Access</div>
                  <div className="text-xs text-muted-foreground">Full control to edit entries</div>
                </div>
              </Button>
            </>
          )}

          {view === 'login' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="bg-muted/50"
                  disabled={loading}
                />
                
                {error && (
                  <p className="text-destructive text-sm">{error}</p>
                )}

                <Button onClick={handleLogin} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
              </div>
            </>
          )}

          {view === 'setup' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Create Password
                  </label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/50"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetup()}
                    className="bg-muted/50"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <p className="text-destructive text-sm">{error}</p>
                )}

                <Button onClick={handleSetup} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Up & Continue
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
