export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred. Please try again.';
  
  // If it's just a string, try to clean it up or return as is if it doesn't look like a raw firebase error
  if (typeof error === 'string') {
    if (error.toLowerCase().includes('firebase')) return 'An unexpected error occurred. Please try again.';
    return error;
  }

  const code = error.code || '';
  
  switch (code) {
    case 'auth/invalid-verification-code':
      return 'The verification code you entered is incorrect. Please try again.';
    case 'auth/code-expired':
      return 'This verification code has expired. Please request a new one.';
    case 'auth/invalid-phone-number':
      return 'The phone number entered is invalid. Please check and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again later.';
    case 'auth/credential-already-in-use':
    case 'auth/phone-number-already-exists':
      return 'This phone number is already linked to another account.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    case 'auth/captcha-check-failed':
      return 'Security check failed. Please try again.';
    case 'auth/invalid-app-credential':
    case 'auth/app-not-authorized':
      return 'App verification failed. Please contact support.';
    default:
      // Fallback for unknown errors, ensuring "Firebase" is stripped if it somehow leaks
      const msg = error.message || '';
      if (msg.toLowerCase().includes('firebase')) {
        return 'An unexpected error occurred. Please try again.';
      }
      return msg || 'An unexpected error occurred. Please try again.';
  }
};
