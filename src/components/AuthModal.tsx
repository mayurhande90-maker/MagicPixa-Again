import React, { useState, useEffect, ReactNode } from 'react';
import { GoogleIcon, MagicPixaLogo } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  error?: ReactNode | null;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  onClose, 
  onGoogleSignIn,
  error: propError,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If a prop error is passed from the main app, it takes precedence.
  const error = propError || internalError;
  
  // Clear any internal modal error if a new error is passed from props.
  useEffect(() => {
    if(propError) {
      setInternalError(null);
    }
  }, [propError]);


  const handleGoogleClick = async () => {
    setInternalError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
      // On redirect, this component will unmount before the code below runs.
      // isLoading will reset on component re-mount.
    } catch (err: any) {
      setInternalError(err.message || 'Failed to sign in with Google.');
      // Only set loading to false on an immediate error, as success causes a page redirect.
      setIsLoading(false); 
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      aria-labelledby="auth-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full max-w-sm m-4 p-8 rounded-2xl shadow-xl border border-gray-200/80"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center">
            <div className="flex justify-center mb-4">
                <MagicPixaLogo />
            </div>
          <h2 id="auth-modal-title" className="text-2xl font-bold text-[#1E1E1E] mb-2">
            Sign In to Continue
          </h2>
          <p className="text-[#5F6368] mb-6">
            Access your projects and unlock all features.
          </p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm text-left break-words">
                {error}
            </div>
        )}

        <button
          onClick={handleGoogleClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <>
              <GoogleIcon className="w-6 h-6" />
              <span>Sign In with Google</span>
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
            By signing in, you agree to our Terms of Service.
        </p>

      </div>
    </div>
  );
};

// FIX: Added missing default export.
export default AuthModal;
