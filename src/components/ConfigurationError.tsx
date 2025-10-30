
import React from 'react';

interface ConfigurationErrorProps {
  missingKeys: string[];
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ missingKeys }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e0e0e] p-4 text-center">
    <div>
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Application Not Configured
      </h1>
      <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
        This application is not properly connected to its backend services.
        If you are the administrator, please ensure that all required environment variables are correctly set up in your hosting provider's dashboard.
      </p>
      {missingKeys.length > 0 && (
        <div className="mt-6 text-left max-w-md mx-auto bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-800/70">
            <h3 className="font-semibold text-red-800 dark:text-red-300">The following keys appear to be missing:</h3>
            <ul className="list-disc list-inside mt-2 text-sm text-red-700 dark:text-red-400 font-mono">
                {missingKeys.map(key => <li key={key}>{key}</li>)}
            </ul>
        </div>
      )}
    </div>
  </div>
);

export default ConfigurationError;
