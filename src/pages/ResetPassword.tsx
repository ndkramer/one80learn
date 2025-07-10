import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { Lock, AlertCircle, Loader2, Mail, CheckCircle, ArrowLeft, CheckCheck } from 'lucide-react';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../utils/authContext';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized, updatePassword } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      console.log('ResetPassword: Checking for active session or tokens');

      console.log('ResetPassword: URL:', window.location.href);
      console.log('ResetPassword: URL hash:', window.location.hash);
      console.log('ResetPassword: URL search params:', window.location.search);

      try {
        // Check for token in query parameters
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        const type = queryParams.get('type');
        
        // Check for access_token in hash (from Supabase redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        console.log('ResetPassword: Token check:', { 
          hasQueryToken: !!token, 
          hasAccessToken: !!accessToken 
        });

        // Case 1: We have an access_token in the hash (standard Supabase flow)
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) throw error;
            
            if (data?.session) {
              console.log('ResetPassword: Session established from hash tokens');
              setShowPasswordForm(true);
              
              // Clean up URL
              window.history.replaceState({}, document.title, '/reset-password');
            }
          } catch (err) {
            console.error('ResetPassword: Error setting session from hash:', err);
            setInitialLoadError('Error verifying your session. Please request a new link.');
          }
        }
        // Case 2: We have a token in query params (direct link from email)
        else if (token && type === 'recovery') {
          try {
            // Use the recovery token to verify and get a session
            const { data, error } = await supabase.auth.verifyOtp({
              token,
              type: 'recovery'
            });
            
            if (error) throw error;
            
            if (data?.session) {
              console.log('ResetPassword: Session established from recovery token');
              setShowPasswordForm(true);
              
              // Clean up URL
              window.history.replaceState({}, document.title, '/reset-password');
            }
          } catch (err) {
            console.error('ResetPassword: Error verifying recovery token:', err);
            setInitialLoadError('Unable to verify the reset link. Please try again or request a new link.');
          }
        }
        // Case 3: Check for existing session
        else {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('ResetPassword: Active session found');
            setShowPasswordForm(true);
          } else {
            console.log('ResetPassword: No active session or tokens found');
            // No error - just show the request form
          }
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setInitialLoadError('An error occurred while verifying your session.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    let redirectTimer: NodeJS.Timeout;
    if (success) {
      console.log('ResetPassword: Password reset successful, redirecting to login in 3 seconds.');
      redirectTimer = setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Your password has been reset successfully. Please log in with your new password.'
          }
        });
      }, 3000);
    }
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [success, navigate]);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsSendingResetLink(true);
    setError(null);
    setResetLinkSent(false);
    console.log('ResetPassword: Sending reset link to:', email);

    try {
      const redirectTo = window.location.origin + '/reset-password';
      console.log('ResetPassword: Using redirect URL:', redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setResetLinkSent(true);
      setEmail('');
      console.log('ResetPassword: Reset password email sent successfully');
    } catch (err) {
      console.error('Error sending reset password email:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset password email');
    } finally {
      setIsSendingResetLink(false);
    }
  };

  useEffect(() => {
    console.log('Auth state:', { isInitialized, isAuthenticated });
  }, [isInitialized, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('ResetPassword: Attempting to set new password.');
    
    if (!password) {
      setError('Password is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      console.log('ResetPassword: Password mismatch.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      console.log('ResetPassword: Password too short.');
      return;
    }

    setIsLoading(true);
    console.log('ResetPassword: Calling updatePassword from authContext.');

    try {
      const { success, error } = await updatePassword(password);
      console.log('ResetPassword: updatePassword result:', { success, error });
      if (!success) throw new Error(error || 'Failed to reset password');
      setSuccess(true);
      console.log('ResetPassword: Password updated successfully.');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
      console.log('ResetPassword: handleSubmit finished. isLoading:', false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 min-h-[300px]">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-[#F98B3D] flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
            {showPasswordForm ? 'Reset Your Password' : 'Request Password Reset'}
          </h2>

          {isLoading ? (
            <div className="text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Verifying your reset link...</p>
            </div>
          ) : initialLoadError ? (
            <div className="text-center">
              <Alert type="error" title="Verification Error">
                {initialLoadError}
                <div className="mt-4">
                    <Button
                      onClick={() => {
                        setInitialLoadError(null);
                        navigate('/reset-password');
                      }}
                      className="w-full"
                    >
                      Request New Reset Link
                    </Button>
                </div>
              </Alert>
            </div>
          ) : showPasswordForm ? (
            success ? (
              <div className="text-center">
                <Alert type="success" title="Success">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
                    <p className="text-lg font-medium">Your password has been reset successfully!</p>
                    <p className="mt-2">You will be redirected to the login page in a few seconds...</p>
                    <Button
                      onClick={() => navigate('/login', {
                        state: {
                          message: 'Your password has been reset successfully. Please log in with your new password.'
                        }
                      })}
                      className="w-full mt-4"
                    >
                      Return to Login Now
                    </Button>
                  </div>
                </Alert>
              </div>
            ) : (
              <>
                {error && (
                  <Alert type="error" title="Error" onClose={() => setError(null)}>
                    <div className="flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span>{error}</span>
                    </div>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Create New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    isLoading={isLoading} 
                    className="w-full"
                  >
                    Reset Password
                  </Button>
                </form>
              </>
            )
          ) : (
            <>
              {error && (
                <Alert type="error" title="Error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              {resetLinkSent && (
                <Alert type="success" title="Reset Link Sent" onClose={() => setResetLinkSent(false)}>
                  <p>Check your email for a password reset link.</p>
                  <p className="mt-2">Click the link in the email to reset your password.</p>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>If you don't see the email:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li>Check your spam or junk folder</li>
                        <li>Make sure you entered the correct email address</li>
                        <li>Allow a few minutes for the email to arrive</li>
                      </ul>
                  </div>
                </Alert>
              )}
              {!resetLinkSent && (
                <form onSubmit={handleSendResetLink} className="space-y-6">
                  <p className="text-gray-600 mb-4">
                    Enter your email address below and we'll send you a link to reset your password.
                  </p>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <Button type="submit" isLoading={isSendingResetLink} className="w-full">
                    {isSendingResetLink ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              )}
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center text-[#F98B3D] hover:text-[#e07a2c] text-sm font-medium">
                  <ArrowLeft size={16} className="mr-1" />
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Need help? Contact support at hello@one80labs.com</p>
      </div>
    </div>
  );
};

export default ResetPassword;
