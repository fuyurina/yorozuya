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
        <div className="flex h-screen w-full">
          <Sidebar />
          <div className="flex flex-col flex-1 md:pl-[56px]">
            <Header />
            <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)]">
              {children}
            </main>
          </div>
        </div>
      </Providers>
    </SSEProvider>
  )
} 