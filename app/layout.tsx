import '@/app/globals.css'
import { Inter } from 'next/font/google'
import { Header } from "@/components/Header"
import {Sidebar} from "@/components/Sidebar"
import { Footer } from "@/components/Footer"
import type { Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dashboard',
  description: 'Aplikasi dashboard modular',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full overflow-hidden">
    
      <body className={`h-full ${inter.className} flex flex-col overflow-hidden`}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden md:pl-[56px]">
            <Header />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
