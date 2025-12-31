import React from 'react';
import { useTheme, themeConfig } from '../../../theme/theme';

const Policy = ({ isOpen, onClose, onAgree }) => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  if (!isOpen) return null;

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  return (
    <>
      {/* Blur Background */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={`${colors.surface} border ${colors.border} rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${colors.border}`}>
            <h2 className={`text-2xl font-bold ${colors.text}`}>
              Privacy Policy
            </h2>
            <button
              onClick={onClose}
              className={`p-2 ${colors.textMuted} hover:${colors.text} rounded-lg hover:${colors.surfaceSecondary} transition-colors`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-6 md:p-8">
            <div className="space-y-6">
              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Information We Collect
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  We collect information that you provide directly to us, including your email address, 
                  portfolio data, and trading preferences. This information is used solely to provide 
                  you with AI-powered portfolio analysis and recommendations.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  How We Use Your Information
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  Your information is used to generate personalized portfolio insights, risk assessments, 
                  and trading recommendations. We do not sell your personal information to third parties.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Data Security
                </h3>
                <p className={`${colors.textMuted} leading-relaxed`}>
                  We implement industry-standard security measures to protect your data. However, no method 
                  of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h3 className={`text-lg font-semibold ${colors.text} mb-3`}>
                  Important Disclaimer
                </h3>
                <div className={`${colors.surfaceSecondary} border ${colors.border} rounded-lg p-4`}>
                  <p className={`${colors.textMuted} leading-relaxed`}>
                    <strong className={colors.text}>Your AI Trade Partner does not take any responsibility for trading losses.</strong> 
                    All investment decisions and their outcomes are solely your responsibility. The AI provides 
                    analysis and insights to help you understand your portfolio, but this is not investment advice. 
                    Trading involves substantial risk of loss and is not suitable for all investors.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer with Agree Button */}
          <div className={`flex items-center justify-end gap-4 p-6 border-t ${colors.border}`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 border ${colors.border} ${colors.text} font-medium rounded-lg hover:${colors.surfaceSecondary} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleAgree}
              className={`px-6 py-2 ${colors.accentBg} text-white font-medium rounded-lg hover:shadow-md transition-all duration-200`}
            >
              I Agree
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Policy;

