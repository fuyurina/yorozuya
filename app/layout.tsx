import '@/app/globals.css'
import { Inter } from 'next/font/google'
import { Header } from "@/app/components/Header"
import { Sidebar } from "@/app/components/Sidebar"
import { Footer } from "@/app/components/Footer"

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dashboard',
  description: 'Aplikasi dashboard modular',
}

// Tambahkan tipe untuk props
interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full">
      <body className={`h-full flex flex-col ${inter.className}`}>
        <Header />
        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar />
          <div className="flex flex-col flex-1">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
              {children}
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
