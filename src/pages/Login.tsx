import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { GraduationCap, AlertCircle, Loader2 } from 'lucide-react';
import Alert from '../components/Alert';

interface LocationState {
  from?: { pathname: string };
  message?: string;
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, isInitialized, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const from = state?.from?.pathname || '/dashboard';
  const message = state?.message;

  useEffect(() => {
    // CRITICAL: This redirect depends on proper RLS policies being in place.
    // The following conditions must be met for login to work:
    // 1. Classes, modules, and resources need read-only policies for all authenticated users
    // 2. User-specific tables (enrollments, notes, progress) need user_id-based policies
    // 3. RLS must be enabled on all tables
    // 4. Avoid complex policy chains that can cause permission issues
    //
    // IMPORTANT: Password reset functionality should be kept separate from the login process
    // to maintain clean separation of concerns and prevent authentication flow issues.
    // Password reset should be handled through a dedicated route and component.
    if (isInitialized && isAuthenticated && location.pathname === '/login') {
      console.log('Redirecting to:', from);
      navigate(from, { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate, from, location.pathname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    console.log('Login form submitted with email:', email);

    try {
      const { success, error: loginError } = await login(email.trim(), password);
      console.log('Login attempt result:', { success, error: loginError });

      if (!success) {
        console.error('Login failed:', loginError);
        setError(loginError || 'Invalid email or password.');
      }
      // Navigation is handled by the useEffect when auth state changes
    } catch (err) {
      console.error('Unexpected error during login:', err);
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-[#F98B3D] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-2xl text-gray-900">Student Portal</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Student Login</h2>
          
          {message && (
            <Alert
              type="success"
              title="Success"
              onClose={() => navigate(location.pathname, { replace: true, state: {} })}
            >
              {message}
            </Alert>
          )}

          {error && (
            <Alert
              type="error"
              title="Authentication Error"
              onClose={() => setError('')}
            >
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>{error}</span>
              </div>
            </Alert>
          )}

          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 bg-[#F98B3D] hover:bg-[#e07a2c] disabled:hover:bg-[#F98B3D] text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D] transition-colors duration-200 flex items-center justify-center mb-4 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            
            <div className="text-center mt-4">
              <Link 
                to="/reset-password"
                className="text-[#F98B3D] hover:text-[#e07a2c] text-sm font-medium"
              >
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Need help? Contact support at hello@one80labs.com</p>
      </div>
    </div>
  );
}

export default Login;