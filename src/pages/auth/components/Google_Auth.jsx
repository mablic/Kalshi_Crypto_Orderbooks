import { useEffect, useRef, useState } from 'react';
import { handleOAuthCallback } from '../../../../lib/User';
import { useAuth } from '../../../../lib/auth/Global_Provider';

const OAuthCallback = () => {
  const [status, setStatus] = useState('Processing authentication...');
  const hasProcessed = useRef(false);
  const { updateAuthState } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        setStatus('Processing authentication...');

        const { user, session, error } = await handleOAuthCallback();

        if (error) {
          setStatus(`Authentication failed: ${error.message}`);
          sendMessageToParent('GOOGLE_AUTH_ERROR', { error: error.message });
          closeWindow();
          return;
        }

        if (user && session) {
          setStatus('Authentication successful!');
          // Update auth state in Global_Provider
          await updateAuthState();
          sendMessageToParent('GOOGLE_AUTH_SUCCESS');
        } else {
          setStatus('Authentication failed: No user or session');
          sendMessageToParent('GOOGLE_AUTH_ERROR', { error: 'No user or session' });
        }
      } catch (error) {
        setStatus('Unexpected error occurred');
        sendMessageToParent('GOOGLE_AUTH_ERROR', { error: error.message });
      } finally {
        closeWindow();
      }
    };

    const sendMessageToParent = (type, data = {}) => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type, ...data }, window.location.origin);
      }
    };

    const closeWindow = () => {
      setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
          setTimeout(() => {
            if (!window.closed) {
              window.location.href = 'about:blank';
            }
          }, 1000);
        } else {
          window.location.href = '/';
        }
      }, 1500);
    };

    processAuth();
  }, [updateAuthState]);

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ color: '#666', fontSize: '16px', margin: '0 0 10px' }}>{status}</p>
        <p style={{ color: '#999', fontSize: '12px' }}>This window will close automatically...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default OAuthCallback;
