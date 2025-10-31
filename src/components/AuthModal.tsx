import React, { useState } from 'react';
import { GoogleIcon } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  onClose, 
  onGoogleSignIn, 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
      // On success, App.tsx will handle closing the modal
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="auth-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 w-full max-w-md m-4 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-20"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
                 <h1 id="auth-modal-title" className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Magic<span className="text-blue-600 dark:text-blue-400">Pixa</span>
                </h1>
            </div>
             <>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                Sign in or create an account to get started.
              </p>
              <div className="space-y-4">
                 <button
                    onClick={handleGoogleClick}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 
                        <svg className="animate-spin h-5 w-5 text-slate-600 dark:text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        : <GoogleIcon className="w-5 h-5" />
                    }
                    Continue with Google
                </button>
                 {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
              </div>
            </>
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default AuthModal;