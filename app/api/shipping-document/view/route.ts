import { NextRequest, NextResponse } from 'next/server';
import { downloadShippingDocument } from '@/app/services/shopeeService';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const shopId = parseInt(searchParams.get('shopId') || '0');
    const orderSns = searchParams.get('orderSns')?.split(',') || [];
    const carrier = searchParams.get('carrier');

    if (!shopId || orderSns.length === 0) {
      return new NextResponse('Parameter tidak valid', { status: 400 });
    }

    const orderList = orderSns.map(orderSn => ({
      order_sn: orderSn,
      shipping_document_type: "THERMAL_AIR_WAYBILL",
      shipping_carrier: carrier
    }));

    const response = await downloadShippingDocument(shopId, orderList);
    
    if (response instanceof Buffer) {
      return new NextResponse(response, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': response.length.toString(),
          'Content-Disposition': `inline; filename="shipping-labels-${Date.now()}.pdf"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    return NextResponse.json(
      { error: "failed_to_get_pdf", message: "Gagal mendapatkan file PDF" },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error saat mengambil PDF:', error);
    return NextResponse.json(
      { error: "internal_server_error", message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
} 