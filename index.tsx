import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import { ThemeProvider } from './src/theme';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Global error handler for the root
window.onerror = (message, source, lineno, colno, error) => {
  console.error("Global Error:", message, error);
  return false;
};

window.onunhandledrejection = (event) => {
  console.error("Unhandled Rejection:", event.reason);
};

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
