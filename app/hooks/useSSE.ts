import { useState, useEffect, useCallback } from 'react';

export const useSSE = (url: string) => {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('SSE terhubung');
      setIsConnected(true);
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      eventSource.close();
      setTimeout(connect, 5000); // Coba hubungkan kembali setelah 5 detik
    };

    eventSource.addEventListener('message', (event) => {
      console.log('Pesan baru diterima:', event.data);
      setLastMessage(event.data);
    });

    return eventSource;
  }, [url]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      eventSource.close();
    };
  }, [connect]);

  return { isConnected, lastMessage };
};
