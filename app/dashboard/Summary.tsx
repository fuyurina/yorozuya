import { useState } from 'react';
import { DashboardSummary } from '@/app/hooks/useDashboard'
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, ShoppingCart, DollarSign, BarChart2, Store } from "lucide-react"

type OrdersSummaryProps = {
  summary: DashboardSummary
}

export function OrdersSummary({ summary }: OrdersSummaryProps) {
  const [isRingkasanVisible, setIsRingkasanVisible] = useState(false);

  const toggleRingkasan = () => {
    setIsRingkasanVisible(!isRingkasanVisible);
  };

  console.log('Summary data received:', summary);

  // Mengumpulkan semua toko unik dari semua sumber data
  const allStores = Array.from(new Set([
    ...Object.keys(summary.pesananPerToko),
    ...Object.keys(summary.omsetPerToko),
    ...Object.keys(summary.iklanPerToko)
  ]));

  // Mengurutkan berdasarkan jumlah pesanan (toko tanpa pesanan akan memiliki nilai 0)
  const sortedStores = allStores.sort((a, b) => 
    (summary.pesananPerToko[b] || 0) - (summary.pesananPerToko[a] || 0)
  );

  return (
    <div className="space-y-2">
      <Card 
        className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg cursor-pointer"
        onClick={toggleRingkasan}
      >
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-12 gap-2">
            <div className="col-span-1 sm:col-span-4 flex items-start">
              <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 mr-2" />
              <div>
                <div className="hidden sm:block text-xs font-medium">TOTAL PESANAN</div>
                <div className="text-sm sm:text-xl font-bold">{summary.totalOrders}</div>
              </div>
            </div>
            <div className="col-span-1 sm:col-span-4 flex items-start justify-end sm:justify-center">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 mr-2" />
              <div>
                <div className="hidden sm:block text-xs font-medium">TOTAL OMSET</div>
                <div className="text-sm sm:text-xl font-bold">Rp {summary.totalOmset.toLocaleString('id-ID')}</div>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-4 flex items-start sm:justify-end">
              <BarChart2 className="h-4 w-4 sm:h-6 sm:w-6 mr-2" />
              <div>
                <div className="hidden sm:block text-xs font-medium">TOTAL IKLAN</div>
                <div className="text-sm sm:text-xl font-bold">Rp {summary.totalIklan.toLocaleString('id-ID')}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isRingkasanVisible && (
        <Card className="rounded-lg overflow-x-auto">
          <CardContent className="p-2 sm:p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Toko</TableHead>
                  <TableHead className="text-right w-[15%]">Qty</TableHead>
                  <TableHead className="text-right w-[27.5%]">Omset</TableHead>
                  <TableHead className="text-right w-[27.5%]">Iklan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStores.map((toko) => (
                  <TableRow key={toko}>
                    <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[120px]">{toko}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm">{summary.pesananPerToko[toko] || 0}</TableCell>
                    <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                      Rp {(summary.omsetPerToko[toko] || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-xs sm:text-sm whitespace-nowrap">
                      Rp {(summary.iklanPerToko[toko] || 0).toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
