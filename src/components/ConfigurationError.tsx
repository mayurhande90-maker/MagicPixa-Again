import React from 'react';

const ConfigurationError: React.FC = () => (
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
        If you are the administrator, please ensure that all required environment variables (e.g., Firebase and Gemini API keys) are correctly set up in your hosting provider's dashboard.
      </p>
    </div>
  </div>
);

export default ConfigurationError;
