import { useState, useEffect } from 'react';

export function useSSE(url: string) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        setData(parsedData);
        console.log('data diterima dari SSE:', parsedData);
      } catch (err) {
        setError('Gagal memparse data');
      }
    };

    eventSource.onerror = () => {
      setError('Koneksi SSE terputus');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { data, error };
}
