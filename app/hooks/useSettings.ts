import { useState, useEffect } from 'react';

interface SettingsData {
  id: number;
  openai_api: string | null;
  openai_model: string | null;
  openai_temperature: number | null;
  openai_prompt: string | null;
  auto_ship: boolean;
  auto_ship_interval: number;
}

interface AutoShipData {
  id: number;
  shop_id: number;
  created_at: string | null;
  updated_at: string | null;
  status_chat: boolean;
  status_ship: boolean;
  shop_name: string; // Tambahkan field ini
}

export function useSettings() {
  const [settingsData, setSettingsData] = useState<SettingsData[]>([]);
  const [autoShipData, setAutoShipData] = useState<AutoShipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettingsData(data.settings);
      setAutoShipData(data.autoShip);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: Partial<SettingsData>, updatedAutoShip: Partial<AutoShipData>[]) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updatedSettings, updatedAutoShip }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      await fetchData(); // Refresh data after saving
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { settingsData, autoShipData, isLoading, error, saveSettings };
}
