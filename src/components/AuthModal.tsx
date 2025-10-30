
import React, { useState } from 'react';
import { GoogleIcon, PaperAirplaneIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onEmailPasswordSubmit: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
}

type View = 'options' | 'email' | 'forgotPassword' | 'resetSent';

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onEmailPasswordSubmit, onGoogleSignIn, onPasswordReset }) => {
  const [view, setView] = useState<View>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailPasswordFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await onEmailPasswordSubmit(email, password);
      // On success, App.tsx will handle closing the modal via onAuthStateChanged
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
        await onPasswordReset(email);
        setView('resetSent');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetFormState = (newView: View) => {
    setView(newView);
    setError(null);
    setPassword('');
    setShowPassword(false);
  };

  const renderContent = () => {
    switch (view) {
      case 'options':
        return (
          <>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sign in or create an account to get started.
            </p>
            <div className="space-y-4">
              <button
                  onClick={handleGoogleClick}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
              >
                  <GoogleIcon className="w-5 h-5" />
                  Continue with Google
              </button>
              <button
                  onClick={() => resetFormState('email')}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-bold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 transition-colors"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  Continue with Email
              </button>
            </div>
          </>
        );
      case 'email':
        return (
            <form onSubmit={handleEmailPasswordFormSubmit} className="space-y-4 text-left">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" placeholder="you@example.com" required />
              </div>
              <div>
                <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <div className="relative mt-1">
                    <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                        {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>
              </div>
              
              {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
                {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Continue'}
              </button>
              <button type="button" onClick={() => resetFormState('forgotPassword')} className="w-full text-center text-sm font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300">Forgot Password?</button>
            </form>
        );
      case 'forgotPassword':
        return (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 text-left">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">Enter your email and we'll send you a link to reset your password.</p>
                <div>
                    <label htmlFor="email-reset" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                    <input type="email" id="email-reset" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" placeholder="you@example.com" required />
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 transition-colors">
                    {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Send Reset Link'}
                </button>
            </form>
        );
        case 'resetSent':
            return (
                 <div className="text-center flex flex-col items-center justify-center min-h-[250px]">
                    <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/50 rounded-full flex items-center justify-center mb-4">
                        <PaperAirplaneIcon className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Check your inbox</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                        If an account exists for <span className="font-semibold text-gray-800 dark:text-gray-100">{email}</span>, you will receive a password reset link.
                    </p>
                    <button onClick={() => resetFormState('email')} className="font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 mt-6 text-sm focus:outline-none">
                        Back to Sign In
                    </button>
                </div>
            );
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
        className="relative bg-white dark:bg-gray-900 w-full max-w-md m-4 p-8 rounded-2xl shadow-2xl glass-card"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-20"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {view !== 'options' && (
             <button 
                onClick={() => resetFormState(view === 'forgotPassword' || view === 'resetSent' ? 'email' : 'options')}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-20"
                aria-label="Back"
            >
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
        )}
        
        <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
                 <h1 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
                </h1>
            </div>
            {renderContent()}
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
