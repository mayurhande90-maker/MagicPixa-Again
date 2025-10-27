
import React, { useState } from 'react';
import { ThemeProvider } from './theme';
import HomePage from './HomePage';
import DashboardPage from './DashboardPage';

export type Page = 'home' | 'dashboard';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen transition-colors duration-300">
        {currentPage === 'home' && <HomePage navigateTo={navigateTo} />}
        {currentPage === 'dashboard' && <DashboardPage navigateTo={navigateTo} />}
      </div>
    </ThemeProvider>
  );
};

export default App;
