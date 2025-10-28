
import React from 'react';
import { GoogleIcon } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
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
            <div className="flex justify-center items-center gap-2 mb-4">
                 <h1 id="auth-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                    <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
                </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
                Sign in to unlock your creative potential.
            </p>

            <button 
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-black dark:text-white border border-gray-300 dark:border-gray-700 font-semibold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            >
                <GoogleIcon className="w-6 h-6" />
                Sign In with Google
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                By continuing, you agree to our <a href="#" className="underline hover:text-cyan-400">Terms of Service</a> and <a href="#" className="underline hover:text-cyan-400">Privacy Policy</a>.
            </p>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AuthModal;
