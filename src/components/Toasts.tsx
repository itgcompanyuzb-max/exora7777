import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export const Toasts: React.FC = () => {
  return (
    <SonnerToaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: '#1e222d',
          borderColor: '#2a2e39',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '12px',
        },
      }}
    />
  );
};
