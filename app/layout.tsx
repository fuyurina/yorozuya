import '@/app/globals.css'
import { Inter } from 'next/font/google'
import { Header } from "@/components/Header"
import {Sidebar} from "@/components/Sidebar"
import { Footer } from "@/components/Footer"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dashboard',
  description: 'Aplikasi dashboard modular',
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full">
      <body className={`h-full ${inter.className}`}>
        <div className="flex h-full">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden md:pl-[56px]">
            <Header />
            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
