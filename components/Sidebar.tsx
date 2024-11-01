'use client'

import React from "react"
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingCart,
  Megaphone,
  Store,
  Settings,
  CodeXml,
  AlertCircle,
  KeyRound
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/webchat', icon: MessageSquare, label: 'Chat' },
  { href: '/ubah_pesanan', icon: ShoppingCart, label: 'Perubahan Pesanan' },
  { href: '/ads', icon: Megaphone, label: 'Iklan' },
  { href: '/shops', icon: Store, label: 'Shops' },
  { href: '/keluhan', icon: AlertCircle, label: 'Keluhan' },
  { href: '/otp', icon: KeyRound, label: 'OTP' },
  { href: '/pengaturan', icon: Settings, label: 'Pengaturan' },
]
export function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  

  return (
    <TooltipProvider>
      <aside className="fixed top-0 left-0 z-20 h-full w-[56px] -translate-x-full border-r transition-transform md:translate-x-0">
        <div className="border-b p-2">
          <Link href="/">
            <Button variant="outline" size="icon" aria-label="Home">
              <CodeXml className="size-5" />
            </Button>
          </Link>
        </div>
        <nav className="grid gap-4 p-2 mt-8">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-lg ${isActive(item.href) ? 'bg-muted' : ''}`}
                    aria-label={item.label}
                  >
                    <item.icon className="size-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  )
}
