
import React from 'react';
import { useTheme } from '../theme';
import { SunIcon, MoonIcon, SystemIcon } from './icons';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { name: 'light', icon: <SunIcon className="w-5 h-5" /> },
    { name: 'dark', icon: <MoonIcon className="w-5 h-5" /> },
    { name: 'system', icon: <SystemIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name as 'light' | 'dark' | 'system')}
          className={`p-1.5 rounded-md transition-colors ${
            theme === t.name ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label={`Switch to ${t.name} theme`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;