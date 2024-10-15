import { useState, useEffect } from 'react';
import { getAllShops } from '@/app/services/shopeeService';

export function useShops() {
  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShops() {
      try {
        setIsLoading(true);
        const data = await getAllShops();
        setShops(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchShops();
  }, []);

  return { shops, isLoading, error };
}