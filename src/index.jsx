import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from 'ctf-ui/formulier';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary kleur="#9f4493" bewaard><App /></ErrorBoundary>
  </React.StrictMode>
);
