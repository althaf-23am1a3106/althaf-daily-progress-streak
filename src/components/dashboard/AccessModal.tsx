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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useAccess } from '@/contexts/AccessContext';
import {
  checkOwnerSetup,
  setupOwnerPassword,
  verifyOwnerPassword,
  requestPasswordOtp,
  resetOwnerPassword,
} from '@/lib/api';
import { Eye, Lock, ArrowLeft, Loader2, Mail } from 'lucide-react';

interface AccessModalProps {
  isOpen: boolean;
}

type ModalView = 'choose' | 'login' | 'setup' | 'forgot' | 'verify-otp' | 'new-password';

export function AccessModal({ isOpen }: AccessModalProps) {
  const { setMode } = useAccess();
  const [view, setView] = useState<ModalView>('choose');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleViewerAccess = () => {
    setMode('viewer');
  };

  const handleOwnerClick = async () => {
    setCheckingSetup(true);
    try {
      const isFirstTime = await checkOwnerSetup();
      setView(isFirstTime ? 'setup' : 'login');
    } catch {
      setError('Failed to check setup status');
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await verifyOwnerPassword(password);
      if (response.error) {
        setError(response.error);
      } else if (response.valid && response.token) {
        sessionStorage.setItem('ownerToken', response.token);
        setMode('owner');
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Failed to verify password');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await setupOwnerPassword(password);
      if (response.error) {
        setError(response.error);
      } else if (response.success && response.token) {
        sessionStorage.setItem('ownerToken', response.token);
        setMode('owner');
      } else {
        setError('Failed to set up password');
      }
    } catch {
      setError('Failed to set up password');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestPasswordOtp();
      if (result.error) {
        setError(result.error);
      } else {
        setView('verify-otp');
        setCountdown(60);
      }
    } catch {
      setError('Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError('');
    setView('new-password');
    setPassword('');
    setConfirmPassword('');
  };

  const handleResetPassword = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await resetOwnerPassword(otp, password);
      if (result.error) {
        setError(result.error);
      } else if (result.success && result.token) {
        sessionStorage.setItem('ownerToken', result.token);
        setMode('owner');
      } else {
        setError('Failed to reset password');
      }
    } catch {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (view === 'new-password') {
      setView('verify-otp');
    } else if (view === 'verify-otp' || view === 'forgot') {
      setView('login');
    } else {
      setView('choose');
    }
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const titles: Record<ModalView, string> = {
    choose: 'Welcome to the Dashboard',
    login: 'Owner Login',
    setup: 'Set Up Owner Access',
    forgot: 'Reset Password',
    'verify-otp': 'Enter Verification Code',
    'new-password': 'Create New Password',
  };

  const descriptions: Record<ModalView, string> = {
    choose: 'How would you like to access this dashboard?',
    login: 'Enter your password to access owner mode',
    setup: 'Create a password to protect owner access (min 8 characters)',
    forgot: 'A 6-digit code will be sent to your registered email',
    'verify-otp': 'Enter the code sent to your email',
    'new-password': 'Set your new password (min 8 characters)',
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="glass-card sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl text-gradient">
            {titles[view]}
          </DialogTitle>
          <DialogDescription className="text-center">
            {descriptions[view]}
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
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
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
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleLogin} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Login
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center"
                  onClick={() => {
                    setError('');
                    setPassword('');
                    setView('forgot');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}

          {view === 'setup' && (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Create Password</label>
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/50"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
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
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button onClick={handleSetup} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Up & Continue
                </Button>
              </div>
            </>
          )}

          {view === 'forgot' && (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  We'll send a 6-digit verification code to your registered email address.
                </p>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button onClick={handleSendOtp} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Code
                </Button>
              </div>
            </>
          )}

          {view === 'verify-otp' && (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button onClick={handleVerifyOtp} className="w-full" disabled={otp.length !== 6}>
                  Verify Code
                </Button>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend code in {countdown}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {view === 'new-password' && (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">New Password</label>
                  <Input
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted/50"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    className="bg-muted/50"
                    disabled={loading}
                  />
                </div>
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button onClick={handleResetPassword} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Reset Password
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
