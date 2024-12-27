'use client'

import { Suspense } from 'react'
import { useDashboard } from '@/app/hooks/useDashboard'
import { OrdersSummary } from './Summary'
import { OrdersDetailTable } from './TableOrder'

export function Dashboard() {
  const { orders, summary } = useDashboard()

  return (
    <Suspense fallback={<div>Memuat data...</div>}>
      <div className="overflow-auto h-[calc(100vh-4rem)]">
        <OrdersSummary summary={summary} />
        <OrdersDetailTable orders={orders} />
      </div>
    </Suspense>
  )
}
