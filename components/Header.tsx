'use client'

import { useState, useEffect } from "react"
import { useTheme } from "next-themes" // Import useTheme
import { CircleUser, Search, Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MobileSidebar } from "./mobile-sidebar"
import Image from "next/image"
import logoGelap from "@/app/fonts/logogelap.png"
import logoTerang from "@/app/fonts/logoterang.png"
import Link from "next/link" // Import Link dari next/link

export function Header() {
  const [isMobile, setIsMobile] = useState(false)
  const { theme, setTheme } = useTheme() // Gunakan useTheme

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

  return (
    <header className="flex h-[53px] items-center justify-between gap-4 border-b bg-muted/40 px-4 lg:px-6">
      {isMobile && <MobileSidebar onNavigate={() => {}} />}
      <div className="flex-1 flex justify-center md:justify-start">
        <Link href="/">
          <Image
            src={theme === 'dark' ? logoGelap : logoTerang}
            alt="Logo Perusahaan"
            width={120}
            height={40}
            className="mx-auto md:mx-0 w-auto h-auto"
          />
        </Link>
      </div>
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
          <DropdownMenuItem>Pengaturan</DropdownMenuItem>
          <DropdownMenuItem>Dukungan</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Keluar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
