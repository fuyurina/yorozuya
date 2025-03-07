'use client'

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function NotificationSettings() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Pengaturan Notifikasi</CardTitle>
        <CardDescription>Test suara notifikasi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label>Test Suara Notifikasi</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const audio = new Audio('/order.mp3');
                  audio.play();
                }}
              >
                Test Suara Order
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const audio = new Audio('/chat.mp3');
                  audio.play();
                }}
              >
                Test Suara Alert
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const audio = new Audio('/notif1.mp3');
                  audio.play();
                }}
              >
                Test Suara Update
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 