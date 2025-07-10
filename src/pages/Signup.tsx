import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import Alert from '../components/Alert';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup, isAuthenticated, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!email || !password || !name) {
      setError('All fields are required');
      console.log('Signup: Validation failed - missing required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      console.log('Signup: Validation failed - password too short');
      return;
    }

    setIsLoading(true);
    console.log('Signup: Submitting signup form');

    try {
      // Create redirect URL for password setup
      const redirectUrl = `${window.location.origin}/set-password`;
      console.log('Signup: Using redirect URL:', redirectUrl);
      
      // Log the exact URL being used
      console.log('Signup: Current origin:', window.location.origin);
      console.log('Signup: Full redirect URL:', redirectUrl);
      console.log('Signup: Absolute URL check:', new URL('/set-password', window.location.origin).href);
      
      const { success, error: signupError } = await signup(
        email.trim(), 
        password, 
        name,
        redirectUrl
      );
      
      if (success) {
        console.log('Signup: Signup successful, redirecting to login');
        console.log('Signup: Redirecting to login with success message');
        navigate('/login', {
          state: {
            message: 'Account created successfully! Please check your email for a confirmation link to verify your account and set your password.'
          }
        });
      } else {
        console.error('Signup: Signup failed:', signupError);
        setError(signupError || 'Failed to create account');
      }
    } catch (err) { 
      console.error('Signup: Unexpected error during signup:', err);
      console.error('Signup: Error details:', err instanceof Error ? err.message : 'Unknown error');
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('Signup: Form submission completed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-[#F98B3D] flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="font-bold text-2xl text-gray-900">One80Learn</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Create your account</h2>
          
          {error && (
            <Alert
              type="error"
              title="Registration Error"
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
            
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
              <p className="mt-1 text-sm text-gray-500">
                Must be at least 8 characters
              </p>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 bg-[#F98B3D] hover:bg-[#e07a2c] disabled:hover:bg-[#F98B3D] text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D] transition-colors duration-200 flex items-center justify-center ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login"
                className="text-[#F98B3D] hover:text-[#e07a2c] font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 text-center text-sm text-gray-500">
        <p>Student Learning Platform</p>
      </div>
    </div>
  );
};

export default Signup;