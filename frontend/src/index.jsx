import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Only use StrictMode in development if explicitly enabled
const shouldUseStrictMode = process.env.NODE_ENV === 'development' && process.env.REACT_APP_STRICT_MODE === 'true';

if (shouldUseStrictMode) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
} 