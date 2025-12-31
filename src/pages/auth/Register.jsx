import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme, themeConfig } from '../../theme/theme';
import { registerUser } from '../../../lib/User';
import { useToast } from '../../toast/Toast';
import { useAuth } from '../../../lib/auth/Global_Provider';
import Policy from './components/Policy';
import Terms from './components/Terms';

const Register = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];
  const navigate = useNavigate();
  const toast = useToast();
  const { updateAuthState } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPolicy: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.agreeToTerms || !formData.agreeToPolicy) {
      toast.error('Please agree to both Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { user, error: registerError } = await registerUser(
        formData.email,
        formData.password,
        formData.name
      );

      if (registerError) {
        const errorMsg = registerError.message || 'Registration failed. Please try again.';
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      if (user) {
        // Update auth state in Global_Provider (this will fetch userDetails)
        await updateAuthState();
        toast.success('Registration successful! Welcome to AI Trade Partner.');
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

  const handleAgreeToTerms = () => {
    setFormData(prev => ({ ...prev, agreeToTerms: true }));
  };

  const handleAgreeToPolicy = () => {
    setFormData(prev => ({ ...prev, agreeToPolicy: true }));
  };

  const canSubmit = formData.agreeToTerms && formData.agreeToPolicy && 
                    formData.name && formData.email && formData.password && 
                    formData.password === formData.confirmPassword;

  return (
    <div className={`min-h-screen ${colors.background} flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${colors.text}`}>
            Create your account
          </h2>
          <p className={`mt-2 text-sm ${colors.textMuted}`}>
            Sign up for Your AI Trade Partner
          </p>
        </div>

        {/* Sign Up Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className={`block text-sm font-medium ${colors.text} mb-2`}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-3 border ${colors.border} rounded-lg ${colors.surface} ${colors.text} placeholder-${colors.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Enter your full name"
              />
            </div>

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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-3 border ${colors.border} rounded-lg ${colors.surface} ${colors.text} placeholder-${colors.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Create a password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${colors.text} mb-2`}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-3 border ${colors.border} rounded-lg ${colors.surface} ${colors.text} placeholder-${colors.textMuted} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          {/* Terms and Policy Checkboxes */}
          <div className="space-y-4">
            <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
              <div className="flex items-start">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="agreeToTerms" className={`ml-3 block text-sm ${colors.text}`}>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsTermsOpen(true);
                    }}
                    className="font-medium text-blue-600 hover:text-blue-500 underline"
                  >
                    Terms of Service
                  </button>
                  {' '}and understand that this is not investment advice. The AI helps me understand my portfolio but does not take responsibility for trading losses.
                </label>
              </div>
            </div>

            <div className={`${colors.surface} border ${colors.border} rounded-lg p-4`}>
              <div className="flex items-start">
                <input
                  id="agreeToPolicy"
                  name="agreeToPolicy"
                  type="checkbox"
                  checked={formData.agreeToPolicy}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="agreeToPolicy" className={`ml-3 block text-sm ${colors.text}`}>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsPolicyOpen(true);
                    }}
                    className="font-medium text-blue-600 hover:text-blue-500 underline"
                  >
                    Privacy Policy
                  </button>
                  {' '}and understand that Your AI Trade Partner does not take responsibility for trading losses.
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${colors.accentBg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Create account'
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

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`w-full inline-flex justify-center py-2 px-4 border ${colors.border} rounded-lg shadow-sm ${colors.surface} text-sm font-medium ${colors.text} hover:${colors.surfaceSecondary} transition-colors`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <button
              type="button"
              className={`w-full inline-flex justify-center py-2 px-4 border ${colors.border} rounded-lg shadow-sm ${colors.surface} text-sm font-medium ${colors.text} hover:${colors.surfaceSecondary} transition-colors`}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="ml-2">GitHub</span>
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className={`text-sm ${colors.textMuted}`}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* Modals */}
      <Terms 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
        onAgree={handleAgreeToTerms}
      />
      <Policy 
        isOpen={isPolicyOpen} 
        onClose={() => setIsPolicyOpen(false)} 
        onAgree={handleAgreeToPolicy}
      />
    </div>
  );
};

export default Register;

