import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { SettingsForm } from './SettingsForm'
import { TemperatureSlider } from "./TemperatureSlider"
import { Textarea } from "@/components/ui/textarea"

import { PromptDialog } from './PromptDialog'

async function checkOpenAIKey(apiKey: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('OpenAI API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
    }

    return response.ok;
  } catch (error) {
    console.error('OpenAI API Check Error:', error);
    return false;
  }
}

async function getSettings() {
  console.log(process.env.NEXT_PUBLIC_BASE_URL)
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/settings`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Gagal mengambil data pengaturan');
  return res.json();
}

// Tambahkan fungsi untuk mengambil push config
async function getPushConfig() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/push-config`, {
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('Gagal mengambil konfigurasi push');
  return res.json();
}

export default async function PengaturanPage() {
  const { pengaturan, autoShip } = await getSettings();
  const pushConfig = await getPushConfig();
  const settings = Array.isArray(pengaturan) ? pengaturan[0] : pengaturan;

  // Cek API key jika tersedia
  const isValidApiKey = settings?.openai_api ? 
    await checkOpenAIKey(settings.openai_api) : 
    false;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pengaturan</h1>
      <SettingsForm>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Pengaturan OpenAI</CardTitle>
            <CardDescription>Konfigurasi untuk API OpenAI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="openai_api">API Key OpenAI</Label>
                <div className="flex gap-2 items-center">
                  <Input 
                    id="openai_api" 
                    name="openai_api"
                    defaultValue={settings?.openai_api || ''}
                  />
                  {settings?.openai_api && (
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        isValidApiKey ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={isValidApiKey ? "API Key valid" : "API Key tidak valid"}
                    />
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openai_model">Model OpenAI</Label>
                <Select defaultValue={settings?.openai_model} name="openai_model">
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-32k">GPT-4 32k</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                
                <TemperatureSlider defaultValue={settings?.openai_temperature || 0.4} />
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="openai_prompt">Prompt</Label>
                  <PromptDialog defaultValue={settings?.openai_prompt || ''} />
                </div>
                <Textarea 
                  id="openai_prompt" 
                  name="openai_prompt"
                  defaultValue={settings?.openai_prompt || ''}
                  rows={5}
                  className="resize-none"
                />
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
                  name="auto_ship"
                  defaultChecked={settings?.auto_ship}
                />
                <Label htmlFor="auto_ship">Aktifkan Auto Ship</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="auto_ship_interval">Interval Auto Ship (menit)</Label>
                <Input
                  id="auto_ship_interval"
                  name="auto_ship_interval"
                  type="number"
                  defaultValue={settings?.auto_ship_interval || 5}
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
                {autoShip?.map((shop: any) => (
                  <TableRow key={shop.shop_id} data-shop-id={shop.shop_id}>
                    <TableCell data-shop-name>{shop.shop_name}</TableCell>
                    <TableCell>
                      <Switch 
                        name="status_chat"
                        defaultChecked={shop.status_chat} 
                      />
                    </TableCell>
                    <TableCell>
                      <Switch 
                        name="status_ship"
                        defaultChecked={shop.status_ship} 
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Pengaturan Push Notification</CardTitle>
            <CardDescription>Konfigurasi webhook dan notifikasi Shopee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="callback_url">URL Callback</Label>
                <Input 
                  id="callback_url" 
                  name="callback_url"
                  defaultValue={pushConfig?.callback_url || ''}
                  placeholder="https://example.com/webhook"
                />
              </div>
              
              <input 
                type="hidden" 
                name="blocked_shop_id_list" 
                value={JSON.stringify(pushConfig?.blocked_shop_id_list || [])} 
              />
              
              <div className="space-y-4">
                <Label>Daftar Toko yang Diblokir</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Toko</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pushConfig?.blocked_shop_id_list?.map((shopId: number) => (
                      <TableRow key={shopId}>
                        <TableCell>{shopId}</TableCell>
                        <TableCell>
                          <span className="text-red-500">Diblokir</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pushConfig?.blocked_shop_id_list || pushConfig.blocked_shop_id_list.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          Tidak ada toko yang diblokir
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        <CardFooter>
          <Button type="submit">Simpan Pengaturan</Button>
        </CardFooter>
      </SettingsForm>
    </div>
  );
}
