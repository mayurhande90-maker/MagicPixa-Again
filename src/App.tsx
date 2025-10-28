
import React, { useState } from 'react';
import { ThemeProvider } from './theme';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';
import AuthModal from './components/AuthModal';

export type Page = 'home' | 'dashboard';

export interface User {
  name: string;
  email: string;
  avatar: string; // Using initials for avatar
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

  const navigateTo = (page: Page) => {
    if (page === 'dashboard' && !isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleLogin = () => {
    const mockUser: User = {
      name: 'Alex Starr',
      email: 'alex.starr@example.com',
      avatar: 'AS'
    };
    setUser(mockUser);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    // After login, navigate to the dashboard
    setCurrentPage('dashboard');
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // After logout, always return to the homepage.
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };
  
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const authProps: AuthProps = {
    isAuthenticated,
    user,
    handleLogout,
    openAuthModal,
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} auth={authProps} />}
        {currentPage === 'dashboard' && isAuthenticated && <DashboardPage navigateTo={navigateTo} auth={authProps} />}
      </div>
      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} onLogin={handleLogin} />}
    </ThemeProvider>
  );
};

export default App;
