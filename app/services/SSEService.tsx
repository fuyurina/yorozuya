// app/services/SSEService.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react';

interface SSEContextType {
  lastMessage: any;
}

const SSEContext = createContext<SSEContextType>({ lastMessage: null });

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    
    const connectSSE = () => {
      eventSource = new EventSource('/api/webhook');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle berbagai tipe notifikasi
          if (['new_message', 'new_order', 'item_violation', 'shopee_update'].includes(data.type)) {
            setLastMessage(data);
          }
          
          // Reset retry count pada koneksi sukses
          setRetryCount(0);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource?.close();
        
        // Coba reconnect dengan exponential backoff
        if (retryCount < MAX_RETRIES) {
          const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connectSSE();
          }, timeout);
        }
      };
    };

    connectSSE();

    // Cleanup pada unmount
    return () => {
      eventSource?.close();
    };
  }, [retryCount]);

  return (
    <SSEContext.Provider value={{ lastMessage }}>
      {children}
    </SSEContext.Provider>
  );
}

export const useSSE = () => useContext(SSEContext);