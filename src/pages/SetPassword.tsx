import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../utils/authContext';
import { Lock, AlertCircle, Check } from 'lucide-react';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';

const SetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  const { updateUserMetadata } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      console.log('SetPassword: Checking for active session or tokens in URL');
      console.log('SetPassword: Full URL:', window.location.href);
      console.log('SetPassword: URL hash:', window.location.hash);
      console.log('SetPassword: URL search params:', window.location.search);
      
      // First check if we need to convert query params to hash
      if (window.location.search.includes('access_token')) {
        const queryParams = new URLSearchParams(window.location.search);
        const accessToken = queryParams.get('access_token');
        const refreshToken = queryParams.get('refresh_token');
        const type = queryParams.get('type');
        
        console.log('SetPassword: Found token in query params, converting to hash format');
        // Convert query params to hash format that Supabase expects
        const hashString = `#access_token=${accessToken}${refreshToken ? `&refresh_token=${refreshToken}` : ''}${type ? `&type=${type}` : ''}`;
        window.location.hash = hashString;
        window.location.search = '';
        console.log('SetPassword: Converted URL to hash format, reloading page');
        window.location.reload();
        return;
      }
      
      // Check for tokens in URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      console.log('SetPassword: URL hash params:', { 
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        type: type || 'none'
      });
      
      try {
        // If we have tokens in the URL, try to establish a session
        if (accessToken) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            console.log('SetPassword: setSession result:', {
              user: data?.user ? 'present' : 'missing',
              session: data?.session ? 'present' : 'missing',
              error
            });
            
            if (data?.session) {
              // Successfully established session from URL tokens
              console.log('SetPassword: Session successfully established from URL tokens', data.session.user.id);
              setHasSession(true);
              
              // Clean up URL to prevent reprocessing on refresh
              window.history.replaceState({}, document.title, '/set-password');
              
              setIsLoading(false);
              return;
            } else if (error) {
              console.error('SetPassword: Error establishing session from URL tokens:', error);
              // Continue to check for existing session below
            }
          } catch (tokenError) {
            console.error('SetPassword: Error processing token:', tokenError);
            // Continue to check for existing session below
          }
        }
        
        // Check if there's an active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('SetPassword: getSession check result:', { 
          session: session ? 'present' : 'missing', 
          error: sessionError 
        });
        if (session?.user) {
          console.log('SetPassword: User ID from session:', session.user.id);
          console.log('SetPassword: User email from session:', session.user.email);
          console.log('SetPassword: User metadata:', session.user.user_metadata);
        }
        
        if (sessionError) {
          console.error('SetPassword: Error checking session:', sessionError);
          setError('Error verifying your session. Please try again.');
          return;
        }
        
        if (session?.user) {
          console.log('SetPassword: Valid session found for user:', session.user.id);
          setHasSession(true);
          
          // Clean up URL if there are tokens
          if (accessToken) {
            window.history.replaceState({}, document.title, '/set-password');
          }
        } else {
          console.log('SetPassword: No active session found and could not establish one from URL tokens');
          setError('Unable to verify your session. The link may have expired or been used already.');
        }
      } catch (err) {
        console.error('SetPassword: Unexpected error checking session:', err);
        setError('An error occurred while verifying your session.');
      } finally {
        setIsLoading(false);
        console.log('SetPassword: Session check completed, isLoading set to false');
      }
    };
    
    // Also check for token in query parameters (some email clients convert # to ?)
    const checkQueryParams = () => {
      const queryParams = new URLSearchParams(window.location.search);
      const accessToken = queryParams.get('access_token');
      const refreshToken = queryParams.get('refresh_token');
      const type = queryParams.get('type');
      
      console.log('SetPassword: Checking query parameters for tokens');
      console.log('SetPassword: Query params:', { 
        accessToken: accessToken ? 'present' : 'missing',
        refreshToken: refreshToken ? 'present' : 'missing',
        type: type || 'none'
      });
      
      if (accessToken) {
        console.log('SetPassword: Found token in query params, converting to hash format');
        // Convert query params to hash format that Supabase expects
        const hashString = `#access_token=${accessToken}${refreshToken ? `&refresh_token=${refreshToken}` : ''}${type ? `&type=${type}` : ''}`;
        window.location.hash = hashString;
        window.location.search = '';
        console.log('SetPassword: Converted URL to hash format, reloading page');
        window.location.reload();
      }
    };
    
    // First check if we need to convert query params to hash
    if (window.location.search.includes('access_token')) {
      // This is now handled at the beginning of checkSession
    } else {
      // Otherwise proceed with normal session check
      checkSession();
    }
  }, []);

  useEffect(() => {
    // Redirect to dashboard after successful password setup
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Password set successfully! You can now log in with your new password.' 
          } 
        });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('SetPassword: Updating user password');
      console.log('SetPassword: Attempting to update password for authenticated user');
      const { data, error } = await supabase.auth.updateUser({ password });
      
      console.log('SetPassword: updateUser result:', {
        user: data?.user ? 'present' : 'missing',
        error
      });
      
      // Check if we need to enroll the user in classes
      if (!error && data?.user) {
        console.log('SetPassword: Password updated successfully, checking enrollments');
        
        // Check if user has any enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', data.user.id)
          .limit(1);
          
        console.log('SetPassword: Enrollment check result:', {
          enrollments: enrollments?.length || 0,
          error: enrollmentError
        });
        
        // Update user metadata to remove needs_password_set flag
        if (!error && data?.user) {
          console.log('SetPassword: Updating user metadata to explicitly set needs_password_set to false');
          const { success, error: metadataError } = await updateUserMetadata({
            needs_password_set: false,
            password_set_at: new Date().toISOString() // Add timestamp when password was set
          });
          
          if (!success) {
            console.warn('SetPassword: Failed to update user metadata:', metadataError);
            // Continue anyway since the password was updated successfully
          }
        }
        
        // If no enrollments, try to enroll in all classes
        if ((!enrollments || enrollments.length === 0) && !enrollmentError) {
          console.log('SetPassword: No enrollments found. Auto-enrollment disabled.');
          // Auto-enrollment functionality has been removed
          // Users will need to be manually enrolled in courses
        }
      }
      
      if (error) {
        console.error('SetPassword: Error updating password:', error);
        console.error('SetPassword: Error code:', error.code);
        console.error('SetPassword: Error status:', error.status);
        throw new Error(error.message);
      }
      
      console.log('SetPassword: Password updated successfully');
      setSuccess(true);
    } catch (err) {
      console.error('SetPassword: Error in password update:', err);
      setError(err instanceof Error ? err.message : 'Failed to set password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-full bg-[#F98B3D] flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Set Your Password
          </h2>

          {isLoading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Verifying your session...</p>
            </div>
          ) : error && !hasSession ? (
            <div className="text-center py-4">
              <Alert type="error" title="Session Error">
                {error}
                <div className="mt-4">
                  <Link 
                    to="/reset-password"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F98B3D] hover:bg-[#e07a2c]"
                  >
                    Request New Link
                  </Link>
                </div>
              </Alert>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <Alert type="success" title="Success">
                <div className="flex flex-col items-center">
                  <Check className="w-12 h-12 text-green-500 mb-2" />
                  <p className="text-lg font-medium">Your password has been set successfully!</p>
                  <p className="mt-2">You will be redirected to the login page in a few seconds...</p>
                </div>
              </Alert>
            </div>
          ) : hasSession ? (
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
                    New Password
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
                  <p className="mt-1 text-xs text-gray-500">
                    Must be at least 8 characters long
                  </p>
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
                  isLoading={isSubmitting}
                  className="w-full"
                >
                  Set Password
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <Alert type="error" title="Session Error">
                Unable to verify your session. Please request a new link.
                <div className="mt-4">
                  <Link 
                    to="/reset-password"
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#F98B3D] hover:bg-[#e07a2c]"
                  >
                    Request New Link
                  </Link>
                </div>
              </Alert>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Need help? Contact support at hello@one80labs.com</p>
      </div>
      
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg max-w-md text-xs text-gray-500 overflow-auto">
          <p className="font-bold">Debug Info:</p>
          <p>URL: {window.location.href}</p>
          <p>Hash: {window.location.hash}</p>
          <p>Search: {window.location.search}</p>
          <p>Has Session: {hasSession ? 'Yes' : 'No'}</p>
          <p>Has Error: {error ? 'Yes' : 'No'}</p>
          <p>Error: {error}</p>
        </div>
      )}
      
      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg max-w-md text-xs text-gray-500">
          <p className="font-bold">Debug Info:</p>
          <p>URL: {window.location.href}</p>
          <p>Has Session: {hasSession ? 'Yes' : 'No'}</p>
          <p>Has Hash Params: {window.location.hash ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  );
};

export default SetPassword;