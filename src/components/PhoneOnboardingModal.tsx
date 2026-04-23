import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowRight, X, ChevronRight, PenTool, ShoppingBag, Terminal, Smartphone, ArrowLeft, Send, ShieldCheck, Mail, MessageSquare, Target, Building2, User } from 'lucide-react';
import { MagicPixaLogo } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth, updateUserProfile, findUserByPhone, mergeUserAccounts } from '../firebase';
import { COUNTRY_CODES } from '../utils/countryCodes';
import { getFriendlyErrorMessage } from '../utils/errorHandling';

interface PhoneOnboardingModalProps {
  onComplete: () => void;
  onSkip: () => void;
  onClose: () => void;
  mode?: 'link' | 'change';
}

type OnboardingStep = 'welcome' | 'role_selection' | 'phone_input' | 'code_input' | 'success' | 'support' | 'merge_confirm';

const ROLES = [
  { id: 'designer', label: 'Designer', icon: <PenTool className="w-5 h-5" /> },
  { id: 'marketer', label: 'Marketer', icon: <Target className="w-5 h-5" /> },
  { id: 'business_owner', label: 'Business Owner', icon: <Building2 className="w-5 h-5" /> },
  { id: 'content_creator', label: 'Content Creator', icon: <User className="w-5 h-5" /> },
  { id: 'ecommerce', label: 'E-commerce Seller', icon: <ShoppingBag className="w-5 h-5" /> },
  { id: 'other', label: 'Other', icon: <Terminal className="w-5 h-5" /> },
];

const PhoneOnboardingModal: React.FC<PhoneOnboardingModalProps> = ({ onComplete, onSkip, onClose, mode = 'link' }) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [confirmedRole, setConfirmedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('');
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<firebase.auth.ConfirmationResult | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  useEffect(() => {
    // Initialize reCAPTCHA verifier when component mounts
    if (!(window as any).recaptchaVerifier && auth) {
        try {
            (window as any).recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-onboarding-container', {
                size: 'invisible',
            });
            console.log("Onboarding reCAPTCHA initialized");
        } catch (e) {
            console.error("reCAPTCHA Init Error:", e);
        }
    }
    
    return () => {
      // Cleanup recaptcha on unmount
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = undefined;
      }
    };
  }, []);

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      setStep('code_input');
      setResendTimer(60); 
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/credential-already-in-use') {
        setInternalError('This phone number is already linked to another account. Please use a different number or sign in with that account.');
      } else {
        setInternalError(getFriendlyErrorMessage(err));
      }
      
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
      if (!auth?.currentUser) throw new Error("No user session found. Please sign in again.");

      // Create a credential with the code
      const credential = firebase.auth.PhoneAuthProvider.credential(
        (confirmationResult as any).verificationId,
        verificationCode
      );

      try {
          // Try to link the phone number to the current account
          const linkResult = await auth.currentUser.linkWithCredential(credential);
          
          const finalRole = selectedRole === 'other' ? customRole : selectedRole;
          const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
          const formattedPhone = `${countryCode}${cleanPhone}`;
          
          await updateUserProfile(auth.currentUser.uid, { 
            phoneNumber: linkResult.user?.phoneNumber || formattedPhone,
            role: finalRole,
            phoneUnlinked: firebase.firestore.FieldValue.delete() as any
          });
          
          setStep('success');
          setTimeout(() => {
            onComplete();
          }, 2500);
      } catch (linkErr: any) {
          console.error("Link Error:", linkErr);
          
          // Store the role in case we need to use it in handleMerge (Force Link)
          const finalRole = selectedRole === 'other' ? customRole : selectedRole;
          setConfirmedRole(finalRole);

          const isAlreadyInUse = 
            linkErr.code === 'auth/credential-already-in-use' || 
            linkErr.code === 'auth/account-exists-with-different-credential' ||
            linkErr.message?.includes('already-in-use') ||
            linkErr.message?.includes('already-exists');

          if (isAlreadyInUse) {
              setStep('merge_confirm');
              setIsLoading(false);
          } else {
              throw linkErr;
          }
      }
    } catch (err: any) {
      console.error("Verification Error:", err);
      const message = err.message || getFriendlyErrorMessage(err);
      setInternalError(message);
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    console.log("Merge button clicked");
    setIsLoading(true);
    setInternalError(null);
    try {
      if (!auth?.currentUser) throw new Error("No user logged in.");
      
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const formattedPhone = `${countryCode}${cleanPhone}`;
      
      console.log("Finding user by phone:", formattedPhone);
      const existingUser = await findUserByPhone(formattedPhone);
      
      if (!existingUser) {
          console.log("No existing profile found. Performing Smart Force-Link.");
          // If no profile found to merge, just link the phone to the current profile and finish
          await updateUserProfile(auth.currentUser.uid, { 
            phoneNumber: formattedPhone,
            role: confirmedRole || 'member',
            phoneUnlinked: firebase.firestore.FieldValue.delete() as any
          });
      } else {
          console.log("Merging accounts:", existingUser.uid, "into", auth.currentUser.uid);
          // Merge the Phone account (source) into the current Google account (target)
          await mergeUserAccounts(existingUser.uid, auth.currentUser.uid, auth.currentUser.uid);
      }
      
      console.log("Process successful");
      setStep('success');
      setTimeout(() => {
        onComplete();
      }, 2500);
    } catch (err: any) {
      console.error("Merge Error:", err);
      setInternalError(err.message || getFriendlyErrorMessage(err));
      setIsLoading(false);
    }
  };

  const handleNextFromRole = () => {
      if (!selectedRole) return;
      if (selectedRole === 'other' && !customRole) return;
      setStep('phone_input');
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as any } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" as any } }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-md mx-4 overflow-hidden bg-white rounded-3xl shadow-2xl border border-white/20">
        
        {/* Header decoration */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pb-10">
          <AnimatePresence mode="wait">
            
            {step === 'welcome' && (
              <motion.div 
                key="welcome"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="text-center"
              >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-indigo-50 rounded-2xl">
                        <MagicPixaLogo />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Welcome to MagicPixa!</h2>
                <p className="text-gray-500 text-lg leading-relaxed mb-8">
                  We're excited to have you here. Let's take 30 seconds to personalize your creative studio.
                </p>
                <button
                  onClick={() => setStep('role_selection')}
                  className="group w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-200"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {step === 'role_selection' && (
              <motion.div 
                key="role"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">What best describes you?</h2>
                <p className="text-gray-500 mb-6 text-sm">This helps us tailor your tools and features.</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                        selectedRole === role.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-100' 
                          : 'border-gray-100 hover:border-gray-200 text-gray-600'
                      }`}
                    >
                      <div className={`mb-2 p-2 rounded-lg ${selectedRole === role.id ? 'bg-white' : 'bg-gray-50'}`}>
                        {role.icon}
                      </div>
                      <span className="text-sm font-bold">{role.label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedRole === 'other' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-6"
                    >
                      <input
                        type="text"
                        placeholder="Please specify your role..."
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        autoFocus
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleNextFromRole}
                  disabled={!selectedRole || (selectedRole === 'other' && !customRole)}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all flex justify-center items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {step === 'phone_input' && (
              <motion.div 
                key="phone"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-indigo-50 rounded-full">
                        <Smartphone className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Instant Access</h2>
                <p className="text-gray-500 mb-8 text-center text-sm px-2">
                  Finish your setup. Providing a mobile number ensures your account remains accessible across all your devices.
                </p>

                {internalError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 animate-shake">
                        {internalError}
                    </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="flex gap-2">
                        <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="w-[100px] px-3 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50 text-sm font-bold"
                            disabled={isLoading}
                        >
                            {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.code}>{c.label}</option>
                            ))}
                        </select>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Mobile Number"
                            className="flex-1 px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg font-medium"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isLoading || !phoneNumber}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-indigo-100"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Send Verification Code'}
                    </button>
                    
                    <p className="text-[10px] text-gray-400 text-center px-4 leading-normal">
                      By continuing, you agree to receive a one-time verification code via SMS. Standard rates may apply.
                    </p>
                </form>

                <div className="mt-8 pt-4 border-t border-gray-100 text-center">
                    <button 
                        onClick={() => { setStep('support'); setInternalError(null); }}
                        className="text-indigo-600 text-sm font-bold hover:underline flex items-center justify-center gap-2 mx-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Having trouble? Contact Support
                    </button>
                </div>
              </motion.div>
            )}

            {step === 'code_input' && (
              <motion.div 
                key="code"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Verify It's You</h2>
                <p className="text-gray-500 mb-8 text-center text-sm">
                  Enter the 6-digit code sent to <span className="font-bold text-gray-700">{countryCode} {phoneNumber}</span>
                </p>

                {internalError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100">
                        {internalError}
                    </div>
                )}

                <form onSubmit={handleVerifyCode} className="space-y-6">
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="••••••"
                        maxLength={6}
                        className="w-full px-4 py-5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center text-4xl font-bold tracking-[0.5em] text-indigo-600 bg-gray-50/50"
                        disabled={isLoading}
                        autoFocus
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => { setStep('phone_input'); setVerificationCode(''); setInternalError(null); }}
                            disabled={isLoading}
                            className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || verificationCode.length < 6}
                            className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-indigo-100"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : 'Verify Code'}
                        </button>
                    </div>

                    <div className="text-center">
                        {resendTimer > 0 ? (
                            <p className="text-xs text-gray-400 font-medium">
                                Resend available in <span className="text-indigo-600">{resendTimer}s</span>
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleSendCode()}
                                disabled={isLoading}
                                className="text-xs text-indigo-600 font-bold hover:underline"
                            >
                                Resend SMS Code
                            </button>
                        )}
                    </div>
                </form>
              </motion.div>
            )}

            {step === 'support' && (
              <motion.div 
                key="support"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {supportSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-500 mb-8 px-4 text-sm leading-relaxed">
                      We've received your request and will get back to you at {supportEmail} as soon as possible.
                    </p>
                    <button
                      onClick={() => {
                        setStep('phone_input');
                        setSupportSuccess(false);
                        setSupportMessage('');
                      }}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      Back to Onboarding
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Contact Support</h3>
                    <p className="text-gray-500 mb-6 text-sm">Having trouble? Send us a message and we'll help you out.</p>
                    
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setIsLoading(true);
                      try {
                        const { createTicket } = await import('../services/supportService');
                        await createTicket('anonymous', supportEmail, {
                          subject: `Onboarding Issue: ${supportName}`,
                          description: supportMessage,
                          type: 'general'
                        });
                        setSupportSuccess(true);
                      } catch (err: any) {
                        console.error("Support submission error:", err);
                        setInternalError(`Failed to send message: ${err.message || "Please try again."}`);
                      } finally {
                        setIsLoading(false);
                      }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                        <input
                          type="text"
                          required
                          value={supportName}
                          onChange={(e) => setSupportName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">How can we help?</label>
                        <textarea
                          required
                          value={supportMessage}
                          onChange={(e) => setSupportMessage(e.target.value)}
                          placeholder="Describe the issue you're having with phone verification..."
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setStep('phone_input')}
                          className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-indigo-100"
                        >
                          {isLoading ? (
                             <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : 'Send Message'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </motion.div>
            )}

            {step === 'merge_confirm' && (
              <motion.div 
                key="merge"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-amber-50 rounded-full">
                        <ArrowRight className="w-6 h-6 text-amber-600 rotate-90" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Account Found</h2>
                <p className="text-gray-500 mb-6 text-center text-sm">
                  This phone number is already linked to another account. Would you like to merge its data into your Google account?
                </p>

                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                    <p className="text-xs text-indigo-800 leading-relaxed">
                        <strong>What happens?</strong><br/>
                        All your creations and credits from your phone-based account will be combined with this account.
                    </p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleMerge}
                        disabled={isLoading}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex justify-center items-center shadow-lg shadow-indigo-100"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : 'Yes, Merge Accounts'}
                    </button>
                    <button
                        onClick={() => setStep('phone_input')}
                        disabled={isLoading}
                        className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                    >
                        Use Different Number
                    </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { type: "spring", damping: 12 } }}
                className="text-center py-10"
              >
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                </motion.div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">You're All Set!</h2>
                <p className="text-gray-500 mb-0">
                  Welcome to the future of creative AI. Redirecting you to your studio...
                </p>
                
                {/* Visual celebratory pulses */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 0.4, x: '50%', y: '50%' }}
                            animate={{ 
                                scale: 2, 
                                opacity: 0,
                                x: `${Math.random() * 100}%`,
                                y: `${Math.random() * 100}%`
                            }}
                            transition={{ duration: 1, delay: i * 0.15 }}
                            className="absolute w-4 h-4 bg-indigo-400/30 rounded-full"
                        />
                    ))}
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>

          {/* Stable reCAPTCHA container outside animated steps */}
          <div id="recaptcha-onboarding-container"></div>
        </div>
      </div>
    </div>
  );
};

export default PhoneOnboardingModal;
