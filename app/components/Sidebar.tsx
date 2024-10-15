"use client"

import { Home, Users, Settings, Store, Menu } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-20 p-2 bg-gray-800 text-white rounded-md"
      >
        <Menu className="h-6 w-6" />
      </button>
      <aside className={`bg-gray-800 text-white w-64 min-h-screen p-4 fixed top-0 left-0 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav className="space-y-2 mt-16">
          <Link href="/" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
          <Link href="/webchat" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <Users className="h-5 w-5" />
            <span>Chat</span>
          </Link>
          <Link href="/settings" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          <Link href="/shops" className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded">
            <Store className="h-5 w-5" />
            <span>Shops</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
