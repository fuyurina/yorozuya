'use client'

import { useState, useEffect } from "react"
import { useTheme } from "next-themes" // Import useTheme
import { CircleUser, Search, Menu, Sun, Moon, Bell, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react" // Tambahkan import ini
import { useSSE } from "@/app/services/SSEService"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MobileSidebar } from "./mobile-sidebar"
import Image from "next/image"
import logoGelap from "@/app/fonts/logogelap.png"
import logoTerang from "@/app/fonts/logoterang.png"
import Link from "next/link" // Import Link dari next/link
import { cn } from "@/lib/utils"

interface Notification {
  id: number
  type: 'shop_penalty' | 'shopee_update' | 'item_violation'
  action: string
  shop_id: number
  details: any
  timestamp: number
  read: boolean
  title?: string
  content?: string
  url?: string
}

export function Header() {
  const { status } = useSession() // Tambahkan hook useSession
  const [isMobile, setIsMobile] = useState(false)
  const { theme, setTheme } = useTheme() // Gunakan useTheme
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { lastMessage } = useSSE();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications?unread_only=true')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Tambahkan useEffect untuk lastMessage
  useEffect(() => {
    if (!lastMessage) return;
    
    // Refresh notifikasi ketika ada message baru
    if (['shop_penalty', 'shopee_update', 'item_violation'].includes(lastMessage.type)) {
      fetchNotifications();
    }
  }, [lastMessage]);

  // Handle klik notifikasi
  const handleNotificationClick = async (notificationId: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] })
      })
      
      // Refresh notifications
      fetchNotifications()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Handle tandai semua dibaca
  const markAllAsRead = async () => {
    try {
      const notificationIds = notifications.map(n => n.id)
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: notificationIds })
      })
      
      // Refresh notifications
      fetchNotifications()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark') // Ubah tema
  }

  const handleLogout = async () => {
    try {
      await signOut({ 
        redirect: true,
        callbackUrl: "/login"
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Jika user belum login, jangan tampilkan header
  if (status !== "authenticated") {
    return null
  }

  return (
    <header className="flex h-[53px] items-center justify-between gap-4 border-b bg-muted/40 px-4 lg:px-6">
      <div className="w-[60px]">
        {isMobile && <MobileSidebar onNavigate={() => {}} />}
      </div>
      <div className="flex-1 flex justify-center">
        <Link href="/">
          <Image
            src={theme === 'dark' ? logoGelap : logoTerang}
            alt="Logo Perusahaan"
            width={120}
            height={40}
            className="w-auto h-auto"
          />
        </Link>
      </div>
      <div className="flex items-center gap-3 w-auto min-w-[60px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
              <span className="sr-only">Notifikasi</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[320px] md:w-[380px]">
            <DropdownMenuLabel className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold">Notifikasi</span>
              {notifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Tandai semua dibaca
                </Button>
              )}
            </DropdownMenuLabel>

            {notifications.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification.id)}
                    className="cursor-pointer p-4 hover:bg-muted/50 border-b last:border-b-0"
                  >
                    {notification.type === 'shopee_update' ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-full bg-blue-100 text-blue-600">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification?.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {notification?.content}
                            </p>
                            {notification?.url && (
                              <a 
                                href={notification.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-2 text-xs text-blue-600 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification.id);
                                }}
                              >
                                Buka Tautan
                              </a>
                            )}
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {new Date(notification.timestamp * 1000).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : notification.type === 'item_violation' ? (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 p-2 rounded-full",
                            notification.action === 'ITEM_BANNED' && "bg-red-100 text-red-600",
                            notification.action === 'ITEM_DELETED' && "bg-orange-100 text-orange-600",
                            notification.action === 'ITEM_DEBOOSTED' && "bg-yellow-100 text-yellow-600"
                          )}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {notification.action === 'ITEM_BANNED' && 'Produk Diblokir'}
                              {notification.action === 'ITEM_DELETED' && 'Produk Dihapus'}
                              {notification.action === 'ITEM_DEBOOSTED' && 'Produk Diturunkan'}
                            </p>
                            <p className="mt-1 text-xs font-medium text-muted-foreground">
                              {notification.details.item_name}
                            </p>
                            <div className="mt-2 space-y-2">
                              {notification.details.violations.map((v: any, i: number) => (
                                <div key={i} className="text-xs space-y-1">
                                  <p className="text-red-600">{v.type}: {v.reason}</p>
                                  <p className="text-muted-foreground">{v.suggestion}</p>
                                  {v.suggested_category && (
                                    <p className="text-muted-foreground">
                                      Kategori yang disarankan: {v.suggested_category.map((c: { name: any }) => c.name).join(' > ')}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-muted-foreground">
                                    Batas waktu: {new Date(v.deadline * 1000).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "mt-0.5 p-2 rounded-full",
                            notification.action === 'POINT_ISSUED' && "bg-red-100 text-red-600",
                            notification.action === 'POINT_REMOVED' && "bg-green-100 text-green-600",
                            notification.action === 'TIER_UPDATE' && "bg-orange-100 text-orange-600"
                          )}>
                            {notification.action === 'POINT_ISSUED' && <AlertCircle className="h-4 w-4" />}
                            {notification.action === 'POINT_REMOVED' && <CheckCircle className="h-4 w-4" />}
                            {notification.action === 'TIER_UPDATE' && <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {notification.action === 'POINT_ISSUED' && 'Penambahan Poin Penalti'}
                              {notification.action === 'POINT_REMOVED' && 'Penghapusan Poin Penalti'}
                              {notification.action === 'TIER_UPDATE' && 'Update Tier Hukuman'}
                            </p>
                            {/* Details */}
                            <div className="mt-1 text-xs text-muted-foreground space-y-1">
                              {notification.details.points && (
                                <p>
                                  <span className="font-medium">{notification.details.points} poin</span>
                                  {notification.details.violation_type && 
                                    <span className="text-muted-foreground"> - {notification.details.violation_type}</span>
                                  }
                                  {notification.details.reason && 
                                    <span className="text-muted-foreground"> - {notification.details.reason}</span>
                                  }
                                </p>
                              )}
                              {notification.details.old_tier && (
                                <p>
                                  Perubahan dari Tier <span className="font-medium">{notification.details.old_tier}</span> ke 
                                  Tier <span className="font-medium">{notification.details.new_tier}</span>
                                </p>
                              )}
                            </div>
                            {/* Timestamp */}
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              {new Date(notification.timestamp * 1000).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Tidak ada notifikasi baru</p>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {!isMobile && (
          <Button onClick={toggleTheme} variant="secondary" size="icon" className="rounded-full">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="flex items-center">
              My Account
              {isMobile && (
                <Button onClick={toggleTheme} variant="ghost" size="icon" className="ml-auto">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/pengaturan">Pengaturan</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
