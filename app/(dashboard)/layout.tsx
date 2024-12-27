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
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar />
          <div className="flex flex-col w-full md:pl-[56px]">
            <Header />
            <main className="h-[calc(100vh-64px)] overflow-y-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </Providers>
    </SSEProvider>
  )
} 