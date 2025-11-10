import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { logger } from "./utils/logger"

// Global error handler for window errors
window.addEventListener('error', (event: ErrorEvent) => {
  logger.error('Window error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack
  });
  
  // Prevent default browser error handling
  event.preventDefault();
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: String(event.promise)
  });
  
  // Prevent default browser error handling
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
