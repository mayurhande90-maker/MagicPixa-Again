import React, { useState, useEffect } from 'react';
import { MagicPixaLogo } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '../firebase';
import { COUNTRY_CODES } from '../utils/countryCodes';
import { getFriendlyErrorMessage } from '../utils/errorHandling';

interface PhoneOnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
  mode?: 'link' | 'change';
}

const PhoneOnboardingModal: React.FC<PhoneOnboardingModalProps> = ({ onComplete, onSkip, mode = 'link' }) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isCredentialInUse, setIsCredentialInUse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [authStep, setAuthStep] = useState<'phone_input' | 'code_input'>('phone_input');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<firebase.auth.ConfirmationResult | null>(null);

  useEffect(() => {
    // Initialize reCAPTCHA verifier when component mounts
    if (!(window as any).recaptchaVerifier && auth) {
      (window as any).recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-onboarding-container', {
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

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setInternalError('Please enter a valid phone number.');
      return;
    }
    
    setInternalError(null);
    setIsLoading(true);
    
    try {
      if (!auth || !auth.currentUser) throw new Error("User not logged in");
      const appVerifier = (window as any).recaptchaVerifier;
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const formattedPhone = `${countryCode}${cleanPhone}`;
      
      const result = await auth.currentUser.linkWithPhoneNumber(formattedPhone, appVerifier);
      setConfirmationResult(result);
      setAuthStep('code_input');
    } catch (err: any) {
      console.error(err);
      setInternalError(getFriendlyErrorMessage(err));
      if (err.code === 'auth/credential-already-in-use') {
        setIsCredentialInUse(true);
      }
      
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
      // Success! Phone is linked.
      if (auth?.currentUser) {
          const { updateUserProfile } = await import('../firebase');
          await updateUserProfile(auth.currentUser.uid, { phoneNumber: result.user?.phoneNumber || phoneNumber });
      }
      onComplete();
    } catch (err: any) {
      console.error(err);
      setInternalError(getFriendlyErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setIsLoading(true);
    try {
      await auth?.signOut();
      // Redirect to home and open auth modal with phone input
      window.location.href = '/?auth_modal=open&step=phone_input';
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      aria-labelledby="phone-onboarding-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative bg-white w-full max-w-sm m-4 p-8 rounded-2xl shadow-xl border border-gray-200/80">
        
        <div className="text-center">
            <div className="flex justify-center mb-4">
                <MagicPixaLogo />
            </div>
          <h2 id="phone-onboarding-title" className="text-2xl font-bold text-[#1E1E1E] mb-2">
            {authStep === 'phone_input' 
              ? (mode === 'change' ? 'Update Phone' : 'Verify Your Phone') 
              : 'Enter Code'}
          </h2>
          <p className="text-[#5F6368] mb-6">
            {authStep === 'phone_input' 
              ? (mode === 'change' ? 'Enter your new phone number below. We\'ll send a code to verify it.' : 'Please link a phone number to secure your account and continue.') 
              : 'Enter the 6-digit code sent to your phone.'}
          </p>
        </div>

        {internalError && (
            <div className="flex flex-col gap-3 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm shadow-sm">
                <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="leading-relaxed">{internalError}</span>
                </div>
                {isCredentialInUse && (
                    <button
                        onClick={handleSwitchAccount}
                        className="mt-2 text-indigo-600 font-semibold hover:text-indigo-700 text-left flex items-center gap-1"
                    >
                        Sign in with this phone instead
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                )}
            </div>
        )}

        {/* Hidden reCAPTCHA container */}
        <div id="recaptcha-onboarding-container"></div>

        {authStep === 'phone_input' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="onboarding-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
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
                  id="onboarding-phone"
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
            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (mode === 'change' ? 'Update Number' : 'Send Code')}
            </button>
            {mode === 'link' && (
              <button
                type="button"
                onClick={onSkip}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex justify-center items-center mt-2"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={() => auth?.signOut()}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-transparent text-gray-400 text-xs hover:text-gray-600 transition-colors disabled:opacity-50 flex justify-center items-center mt-4"
            >
              Sign Out
            </button>
          </form>
        )}

        {authStep === 'code_input' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="onboarding-code" className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
              <input
                type="text"
                id="onboarding-code"
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
                onClick={() => { setAuthStep('phone_input'); setVerificationCode(''); setInternalError(null); }}
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
      </div>
    </div>
  );
};

export default PhoneOnboardingModal;
