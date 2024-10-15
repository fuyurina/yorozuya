import { DashboardSummary } from '@/app/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type OrdersSummaryProps = {
  summary: DashboardSummary
}

export function OrdersSummary({ summary }: OrdersSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Omset Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {summary.totalOmset.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalOrders}</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan per Toko</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Toko</th>
                <th className="text-right">Pesanan</th>
                <th className="text-right">Omset</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.pesananPerToko).map(([toko, jumlahPesanan]) => (
                <tr key={toko}>
                  <td>{toko}</td>
                  <td className="text-right">{jumlahPesanan}</td>
                  <td className="text-right">Rp {summary.omsetPerToko[toko].toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}