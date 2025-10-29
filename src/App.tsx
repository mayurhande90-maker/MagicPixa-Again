
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AuthModal from './components/AuthModal';
import { auth } from './firebase'; // Import Firebase auth instance
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";

export type Page = 'home' | 'dashboard';

export interface User {
  name: string;
  email: string;
  avatar: string;
}

export interface AuthProps {
  isAuthenticated: boolean;
  user: User | null;
  handleLogout: () => void;
  openAuthModal: () => void;
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // To handle initial auth state loading

  const getInitials = (name: string): string => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in
        const userToSet: User = {
          name: firebaseUser.displayName || 'No Name',
          email: firebaseUser.email || 'No Email',
          avatar: getInitials(firebaseUser.displayName || ''),
        };
        setUser(userToSet);
        setIsAuthenticated(true);
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false); // Finished checking auth state
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const navigateTo = (page: Page) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogin = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user state
      setIsAuthModalOpen(false);
      setCurrentPage('dashboard');
      window.scrollTo(0, 0);
    } catch (error: any) {
      // Provide user-friendly error messages
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please try again.';
      }
      throw new Error(message);
    }
  };
  
  const handleSignUp = async (name: string, email: string, password: string): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // After creating the user, update their profile with the name
      await updateProfile(userCredential.user, { displayName: name });

      // Manually set user for immediate UI update before onAuthStateChanged fires
       const userToSet: User = {
          name: name,
          email: email,
          avatar: getInitials(name),
        };
      setUser(userToSet);
      setIsAuthenticated(true);

      // onAuthStateChanged will also fire, but this ensures a smooth transition
      setIsAuthModalOpen(false);
      setCurrentPage('dashboard');
      window.scrollTo(0, 0);
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Please login.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. It should be at least 6 characters.';
      }
      throw new Error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle clearing user state
      setCurrentPage('home');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Error signing out: ", error);
      // Handle logout error if necessary
    }
  };
  
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    handleLogout,
    openAuthModal,
  };

  // Optional: Show a loading spinner while checking auth state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e0e0e]">
        <svg className="animate-spin h-8 w-8 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} />}
        {currentPage === 'dashboard' && isAuthenticated && <DashboardPage navigateTo={navigateTo} auth={authProps} />}
      </div>
      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} onLogin={handleLogin} onSignUp={handleSignUp} />}
    </ThemeProvider>
  );
};

export default App;
