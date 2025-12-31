import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme, themeConfig } from '../../theme/theme';
import { signInUser, signInWithGoogle } from '../../../lib/User';
import { useToast } from '../../toast/Toast';
import { useAuth } from '../../../lib/auth/Global_Provider';

const SignIn = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const shownMessageRef = useRef(null);
  const { updateAuthState } = useAuth();

  useEffect(() => {
    const message = location.state?.message;
    if (message && shownMessageRef.current !== message) {
      toast.success(message);
      shownMessageRef.current = message;
      // Clear the message from location state to prevent showing it again on re-render
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.message]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { user, error: signInError } = await signInUser(
        formData.email,
        formData.password
      );

      if (signInError) {
        const errorMsg = signInError.message || 'Sign in failed. Please check your credentials and try again.';
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (user) {
        // Update auth state in Global_Provider (this will fetch userDetails)
        await updateAuthState();
        toast.success('Welcome back! You have been successfully signed in.');
        setTimeout(() => {
          navigate('/profile');
        }, 1000);
      }
    } catch (err) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  const googleAuthLoadingRef = useRef(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    googleAuthLoadingRef.current = true;
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        toast.error(error.message || 'Google sign-in failed. Please try again.');
        setIsLoading(false);
        googleAuthLoadingRef.current = false;
        return;
      }

      // Listen for message from popup
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;
        
        // console.log('Sign-in: Received message:', event.data);
        
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler);
          // Update auth state in Global_Provider
          updateAuthState().then(() => {
            toast.success('Welcome! You have been successfully signed in with Google.');
            setIsLoading(false);
            googleAuthLoadingRef.current = false;
            navigate('/profile');
          });
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          console.error('Sign-in: Google OAuth failed:', event.data.error);
          window.removeEventListener('message', messageHandler);
          toast.error(event.data.error || 'Google sign-in failed.');
          setIsLoading(false);
          googleAuthLoadingRef.current = false;
        }
      };

      window.addEventListener('message', messageHandler);
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
      googleAuthLoadingRef.current = false;
    }
  };


  return (
    <div className={`min-h-screen ${colors.background} flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${colors.text}`}>
            Welcome back
          </h2>
          <p className={`mt-2 text-sm ${colors.textMuted}`}>
            Sign in to your AI Trade Partner account
          </p>
        </div>

        {/* Sign In Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${colors.text} mb-2`}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-3 border ${colors.border} rounded-lg ${colors.surface} ${colors.text} placeholder-${colors.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${colors.text} mb-2`}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-3 border ${colors.border} rounded-lg ${colors.surface} ${colors.text} placeholder-${colors.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className={`ml-2 block text-sm ${colors.text}`}>
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot password?
              </a>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${colors.accentBg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${colors.border}`} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`px-2 ${colors.background} ${colors.textMuted}`}>Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`w-full inline-flex justify-center items-center py-3 px-4 border ${colors.border} rounded-lg shadow-sm ${colors.surface} text-sm font-medium ${colors.text} hover:${colors.surfaceSecondary} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className={`text-sm ${colors.textMuted}`}>
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignIn;