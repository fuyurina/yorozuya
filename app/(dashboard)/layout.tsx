import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { GlobalNotification } from '@/components/GlobalNotification';
import { SSEProvider } from '../services/SSEService';
import Providers from "../services/Providers"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SSEProvider>
      <Providers>
        <GlobalNotification />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden md:pl-[56px]">
            <Header />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </Providers>
    </SSEProvider>
  )
} 