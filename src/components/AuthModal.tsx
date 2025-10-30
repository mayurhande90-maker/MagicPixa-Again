import React, { useState } from 'react';
import { GoogleIcon, PaperAirplaneIcon } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onSendAuthLink: (email: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSendAuthLink, onGoogleSignIn }) => {
  const [view, setView] = useState<'enterEmail' | 'emailSent'>('enterEmail');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await onSendAuthLink(email);
      setView('emailSent');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
      // App.tsx handles closing the modal on success
    // FIX: Corrected the syntax of the try-catch-finally block.
    // An extra closing brace and missing braces around the catch statement were causing multiple cascading errors.
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTryDifferentEmail = () => {
      setEmail('');
      setError(null);
      setView('enterEmail');
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
        className="relative bg-white dark:bg-gray-900 w-full max-w-md m-4 p-8 rounded-2xl shadow-2xl glass-card"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        
        <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
                 <h1 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
                </h1>
            </div>
            
            {view === 'enterEmail' ? (
                <>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Sign in or create an account to get started.
                    </p>

                    <button
                        onClick={handleGoogleClick}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <div className="my-4 flex items-center">
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500">OR</span>
                        <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    </div>

                    <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" placeholder="you@example.com" required />
                      </div>
                      
                      {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

                      <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                        {isLoading ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'Continue with Email'}
                      </button>
                    </form>
                </>
            ) : (
                <div className="text-center flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/50 rounded-full flex items-center justify-center mb-4">
                        <PaperAirplaneIcon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your inbox</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                        A sign-in link has been sent to <br/> <span className="font-semibold text-gray-800 dark:text-gray-100">{email}</span>.
                    </p>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        (P.S. If you don't see it, be sure to check your spam folder!)
                    </p>
                    <button onClick={handleTryDifferentEmail} className="font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 mt-6 text-sm focus:outline-none">
                        Use a different email
                    </button>
                </div>
            )}
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