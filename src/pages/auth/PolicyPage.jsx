import React from 'react';
import { useTheme, themeConfig } from '../../theme/theme';

const PolicyPage = () => {
  const { theme } = useTheme();
  const colors = themeConfig[theme];

  return (
    <div className={`min-h-screen ${colors.background} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-4xl mx-auto">
        <div className={`${colors.surface} border ${colors.border} rounded-xl p-8 md:p-12`}>
          <h1 className={`text-3xl font-bold ${colors.text} mb-6`}>
            Privacy Policy
          </h1>
          
          <div className="space-y-6">
            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Information We Collect
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                We collect information that you provide directly to us, including your email address, 
                portfolio data, and trading preferences. This information is used solely to provide 
                you with AI-powered portfolio analysis and recommendations.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                How We Use Your Information
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                Your information is used to generate personalized portfolio insights, risk assessments, 
                and trading recommendations. We do not sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Data Security
              </h2>
              <p className={`${colors.textMuted} leading-relaxed`}>
                We implement industry-standard security measures to protect your data. However, no method 
                of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className={`text-xl font-semibold ${colors.text} mb-3`}>
                Important Disclaimer
              </h2>
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
      </div>
    </div>
  );
};

export default PolicyPage;

