'use client'

import { useState, useEffect } from 'react';
import { useSettings } from '@/app/hooks/useSettings';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function PengaturanPage() {
  const { settingsData, autoShipData, isLoading, error, saveSettings } = useSettings();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    openai_api: '',
    openai_model: '',
    openai_temperature: 0,
    openai_prompt: '',
    auto_ship: false,
    auto_ship_interval: 5,
    status_chat: false,
    status_ship: false,
  });

  const [autoShipStatus, setAutoShipStatus] = useState<Array<{
    shop_id: number;
    shop_name: string;
    status_chat: boolean;
    status_ship: boolean;
  }>>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (settingsData && autoShipData) {
      setFormData({
        openai_api: settingsData[0]?.openai_api || '',
        openai_model: settingsData[0]?.openai_model || '',
        openai_temperature: settingsData[0]?.openai_temperature || 0,
        openai_prompt: settingsData[0]?.openai_prompt || '',
        auto_ship: settingsData[0]?.auto_ship || false,
        auto_ship_interval: settingsData[0]?.auto_ship_interval || 5,
        status_chat: autoShipData[0]?.status_chat || false,
        status_ship: autoShipData[0]?.status_ship || false,
      });
    }
    if (autoShipData) {
      setAutoShipStatus(autoShipData.map(item => ({
        shop_id: item.shop_id,
        shop_name: item.shop_name,
        status_chat: item.status_chat,
        status_ship: item.status_ship,
      })));
    }
  }, [settingsData, autoShipData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setFormData(prevData => ({ ...prevData, [name]: checked }));
  };

  const handleSliderChange = (value: number[]) => {
    setFormData(prevData => ({ ...prevData, openai_temperature: value[0] }));
  };

  const handleStatusChange = (shopId: number, field: 'status_chat' | 'status_ship') => (checked: boolean) => {
    setAutoShipStatus(prevStatus => 
      prevStatus.map(item => 
        item.shop_id === shopId ? { ...item, [field]: checked } : item
      )
    );
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setFormData(prevData => ({ ...prevData, auto_ship_interval: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const updatedSettings = {
      openai_api: formData.openai_api,
      openai_model: formData.openai_model,
      openai_temperature: formData.openai_temperature,
      openai_prompt: formData.openai_prompt,
      auto_ship: formData.auto_ship,
      auto_ship_interval: formData.auto_ship_interval,
    };

    const result = await saveSettings(updatedSettings, autoShipStatus);

    if (result.success) {
      // Tampilkan pesan sukses
      alert('Pengaturan berhasil disimpan');
    } else {
      // Tampilkan pesan error
      alert(`Gagal menyimpan pengaturan: ${result.error}`);
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData(prevData => ({ ...prevData, openai_model: value }));
  };

  if (!isClient) return null; // Render nothing on the server side
  if (isLoading) return <div>Memuat...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pengaturan</h1>
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Pengaturan OpenAI</CardTitle>
            <CardDescription>Konfigurasi untuk API OpenAI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="openai_api">API Key OpenAI</Label>
                <Input id="openai_api" name="openai_api" value={formData.openai_api} onChange={handleInputChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openai_model">Model OpenAI</Label>
                <Select onValueChange={handleSelectChange} value={formData.openai_model}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih model OpenAI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-32k">GPT-4 32k</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                    {/* Tambahkan model lain sesuai kebutuhan */}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openai_temperature">Temperature</Label>
                <Slider
                  id="openai_temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[formData.openai_temperature]}
                  onValueChange={handleSliderChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openai_prompt">Prompt</Label>
                <Input id="openai_prompt" name="openai_prompt" value={formData.openai_prompt} onChange={handleInputChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Pengaturan Auto Ship</CardTitle>
            <CardDescription>Konfigurasi Auto Ship</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_ship"
                  checked={formData.auto_ship}
                  onCheckedChange={handleSwitchChange('auto_ship')}
                />
                <Label htmlFor="auto_ship">Aktifkan Auto Ship</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="auto_ship_interval">Interval Auto Ship (menit)</Label>
                <Input
                  id="auto_ship_interval"
                  type="number"
                  value={formData.auto_ship_interval}
                  onChange={handleIntervalChange}
                  min={1}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Status Auto Ship per Toko</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Toko</TableHead>
                  <TableHead>Status Chat</TableHead>
                  <TableHead>Status Ship</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoShipStatus.map((item) => (
                  <TableRow key={item.shop_id}>
                    <TableCell>{item.shop_name}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.status_chat}
                        onCheckedChange={handleStatusChange(item.shop_id, 'status_chat')}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.status_ship}
                        onCheckedChange={handleStatusChange(item.shop_id, 'status_ship')}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <CardFooter>
          <Button type="submit">Simpan Pengaturan</Button>
        </CardFooter>
      </form>
    </div>
  );
}
