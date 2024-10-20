'use client'

import Link from "next/link"
import { CodeXml } from "lucide-react"
import { navItems } from "./Sidebar"

interface MobileSidebarProps {
  onNavigate: () => void
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <nav className="grid gap-2 text-lg font-medium">
        <Link
          href="#"
          className="flex items-center gap-4 text-lg font-semibold"
        >
          <CodeXml className="h-6 w-6" />
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
            onClick={onNavigate}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
