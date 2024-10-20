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

  console.log('Summary data received:', summary);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-green-500 text-white rounded-lg">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <div>
                  <div className="text-[12px] sm:text-xs font-medium">TOTAL PESANAN</div>
                  <div className="text-base sm:text-xl font-bold">{summary.totalOrders}</div>
                </div>
              </div>
              <div className="flex items-center justify-end">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <div>
                  <div className="text-[12px] sm:text-xs font-medium">TOTAL OMSET</div>
                  <div className="text-base sm:text-xl font-bold">Rp {summary.totalOmset.toLocaleString('id-ID')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500 text-white rounded-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <BarChart2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
                <div>
                  <div className="text-[12px] sm:text-xs font-medium">TOTAL IKLAN</div>
                  <div className="text-base sm:text-xl font-bold">Rp {summary.totalIklan.toLocaleString('id-ID')}</div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white p-0 h-6 w-6 mb-1"
                  onClick={() => setIsRingkasanVisible(!isRingkasanVisible)}
                >
                  {isRingkasanVisible ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isRingkasanVisible && (
        <Card className="rounded-lg">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Toko</TableHead>
                  <TableHead className="text-right">Pesanan</TableHead>
                  <TableHead className="text-right">Omset</TableHead>
                  <TableHead className="text-right">Iklan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.iklanPerToko).map(([toko, biayaIklan]) => (
                  <TableRow key={toko}>
                    <TableCell className="font-medium">{toko}</TableCell>
                    <TableCell className="text-right">{summary.pesananPerToko[toko] || 0}</TableCell>
                    <TableCell className="text-right">
                      Rp {(summary.omsetPerToko[toko] || 0).toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {biayaIklan.toLocaleString('id-ID')}
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
