import React, { useState, useEffect, ReactNode } from 'react';
import { GoogleIcon, MagicPixaLogo } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth, db } from '../firebase';
import { COUNTRY_CODES } from '../utils/countryCodes';
import { getFriendlyErrorMessage } from '../utils/errorHandling';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  error?: ReactNode | null;
  initialStep?: 'initial' | 'phone_input' | 'name_input' | 'phone_link';
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen,
  onClose, 
  onGoogleSignIn,
  error: propError,
  initialStep = 'initial',
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Phone Auth State
  const [authStep, setAuthStep] = useState<'options' | 'phone_input' | 'code_input' | 'name_input' | 'phone_link' | 'code_link'>(
    initialStep === 'phone_input' ? 'phone_input' : 
    initialStep === 'name_input' ? 'name_input' : 
    initialStep === 'phone_link' ? 'phone_link' : 'options'
  );
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<firebase.auth.ConfirmationResult | null>(null);

  // If a prop error is passed from the main app, it takes precedence.
  const error = propError || internalError;
  
  // Clear any internal modal error if a new error is passed from props.
  useEffect(() => {
    if(propError) {
      setInternalError(null);
    }
  }, [propError]);

  useEffect(() => {
    // Initialize reCAPTCHA verifier when component mounts
    if (!(window as any).recaptchaVerifier && auth) {
      (window as any).recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
      });
    }
    
    return () => {
      // Cleanup recaptcha on unmount
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = undefined;
      }
    };
  }, []);

  const handleGoogleClick = async () => {
    setInternalError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
      // On redirect, this component will unmount before the code below runs.
      // isLoading will reset on component re-mount.
    } catch (err: any) {
      setInternalError(getFriendlyErrorMessage(err));
      // Only set loading to false on an immediate error, as success causes a page redirect.
      setIsLoading(false); 
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setInternalError('Please enter a valid phone number.');
      return;
    }
    
    setInternalError(null);
    setIsLoading(true);
    
    try {
      if (!auth) throw new Error("Auth not initialized");
      const appVerifier = (window as any).recaptchaVerifier;
      // Format phone number
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const formattedPhone = `${countryCode}${cleanPhone}`;
      
      let result;
      if (authStep === 'phone_link') {
        if (!auth.currentUser) throw new Error("No user logged in to link phone.");
        // Use linkWithPhoneNumber for existing users
        result = await auth.currentUser.linkWithPhoneNumber(formattedPhone, appVerifier);
        setConfirmationResult(result);
        setAuthStep('code_link');
      } else {
        result = await auth.signInWithPhoneNumber(formattedPhone, appVerifier);
        setConfirmationResult(result);
        setAuthStep('code_input');
      }
    } catch (err: any) {
      console.error(err);
      setInternalError(getFriendlyErrorMessage(err));
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          (window as any).recaptchaVerifier.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || !confirmationResult) {
      setInternalError('Please enter the verification code.');
      return;
    }
    
    setInternalError(null);
    setIsLoading(true);
    
    try {
      const result = await confirmationResult.confirm(verificationCode);
      
      if (authStep === 'code_link') {
        // After linking, we might still need to check if they have a name
        const user = result.user;
        if (db && user) {
          // Clear the phoneUnlinked flag since the user has now linked a phone
          await db.collection('users').doc(user.uid).update({ phoneUnlinked: firebase.firestore.FieldValue.delete() });
          
          const userDoc = await db.collection('users').doc(user.uid).get();
          const userData = userDoc.data();
          const currentName = userData?.name || '';
          
          if (!currentName || currentName.trim() === '' || currentName === 'Creator' || currentName === 'User') {
            setAuthStep('name_input');
            setIsLoading(false);
            return;
          }
        }
        onClose();
        return;
      }

      const isNewUser = result.additionalUserInfo?.isNewUser;
      
      if (isNewUser) {
        setAuthStep('name_input');
        setIsLoading(false);
      } else {
        // Option 1: The Login Catch for old users with missing or default names
        if (db && result.user) {
          const userDoc = await db.collection('users').doc(result.user.uid).get();
          const userData = userDoc.data();
          const currentName = userData?.name || '';
          
          // If name is missing, empty, or the default "Creator" or "User"
          if (!currentName || currentName.trim() === '' || currentName === 'Creator' || currentName === 'User') {
            setAuthStep('name_input');
            setIsLoading(false);
            return;
          }
        }
        // Success! The auth state listener in App.tsx will handle the rest.
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setInternalError(getFriendlyErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setInternalError('Please enter your name.');
      return;
    }

    setInternalError(null);
    setIsLoading(true);

    try {
      if (!auth?.currentUser) throw new Error("No authenticated user found.");
      
      // Import dynamic to avoid circular dependency if any, but auth is already here
      const { updateUserProfile } = await import('../firebase');
      await updateUserProfile(auth.currentUser.uid, { name: userName.trim() });
      
      onClose();
    } catch (err: any) {
      console.error(err);
      setInternalError(getFriendlyErrorMessage(err));
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
            {authStep === 'options' ? 'Sign In to Continue' : 
             authStep === 'phone_input' ? 'Enter Phone Number' : 
             authStep === 'code_input' ? 'Verify Phone' : 
             authStep === 'phone_link' ? 'Let’s Get You Set Up' :
             authStep === 'code_link' ? 'Verify Your Number' :
             'Welcome! What should we call you?'}
          </h2>
          <p className="text-[#5F6368] mb-6">
            {authStep === 'options' ? 'Access your projects and unlock all features.' : 
             authStep === 'phone_input' ? 'We will send you a verification code.' : 
             authStep === 'code_input' ? 'Enter the 6-digit code sent to your phone.' : 
             authStep === 'phone_link' ? 'To give you the best experience on both web and mobile, please take a moment to link your phone number to your profile.' :
             authStep === 'code_link' ? 'Enter the 6-digit code sent to your phone.' :
             'Please tell us your name to complete your profile.'}
          </p>
        </div>

        {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="leading-relaxed">{error}</span>
            </div>
        )}

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {authStep === 'options' && (
          <div className="space-y-3">
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
            
            <button
              onClick={() => { setAuthStep('phone_input'); setInternalError(null); }}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Continue with Phone</span>
            </button>
          </div>
        )}

        {(authStep === 'phone_input' || authStep === 'phone_link') && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-1/3 px-3 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  disabled={isLoading}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="555 555 5555"
                  className="w-2/3 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">We will send a 6-digit verification code.</p>
            </div>
            <div className="flex gap-3">
              {authStep === 'phone_input' && (
                <button
                  type="button"
                  onClick={() => { setAuthStep('options'); setInternalError(null); }}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || !phoneNumber}
                className={`flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center ${authStep === 'phone_link' ? 'w-full' : ''}`}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Send Code'}
              </button>
            </div>

            {authStep === 'phone_link' && (
                <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500 mb-3">Not your account?</p>
                    <button
                        type="button"
                        onClick={async () => {
                            if (auth) {
                                await auth.signOut();
                                onClose();
                            }
                        }}
                        className="text-indigo-600 font-bold hover:underline text-sm"
                    >
                        Sign Out & Switch Account
                    </button>
                </div>
            )}
          </form>
        )}

        {(authStep === 'code_input' || authStep === 'code_link') && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center text-xl tracking-widest"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { 
                  setAuthStep(authStep === 'code_link' ? 'phone_link' : 'phone_input'); 
                  setVerificationCode(''); 
                  setInternalError(null); 
                }}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || verificationCode.length < 6}
                className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {authStep === 'name_input' && (
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                disabled={isLoading}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !userName.trim()}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Complete Sign Up'}
            </button>
          </form>
        )}
        
        <p className="text-xs text-gray-500 mt-6 text-center">
            By signing in, you agree to our Terms of Service.
        </p>

      </div>
    </div>
  );
};

// FIX: Added missing default export.
export default AuthModal;

