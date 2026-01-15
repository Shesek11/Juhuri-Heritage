import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Auth0Provider } from '@auth0/auth0-react';

// Hardcoded for debugging - .env is being stubborn
const domain = "shesek.eu.auth0.com";
const clientId = "MzyV6tq3WF9uJsAwbuHsXglM2bPuvN92";

if (!domain || !clientId) {
  console.warn("⚠️ Auth0 configuration missing! Check .env file.");
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain || ""}
      clientId={clientId || ""}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: `https://${domain}/api/v2/`, // Optional: for API access
        scope: "read:current_user update:current_user_metadata px:read"
      }}
      cacheLocation="localstorage"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);