import { NextRequest, NextResponse } from 'next/server';
import { downloadShippingDocument } from '@/app/services/shopeeService';
import { mergePDFs } from '@/app/utils/pdfUtils';

const BATCH_SIZE = 50; // Batasan dari Shopee API

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const shopId = parseInt(searchParams.get('shopId') || '0');
    const orderSns = searchParams.get('orderSns')?.split(',') || [];
    const carrier = searchParams.get('carrier');

    if (!shopId || orderSns.length === 0) {
      return new NextResponse('Parameter tidak valid', { status: 400 });
    }

    // Bagi orderSns menjadi batch-batch
    const batches = [];
    for (let i = 0; i < orderSns.length; i += BATCH_SIZE) {
      batches.push(orderSns.slice(i, i + BATCH_SIZE));
    }

    console.log(`Memproses ${orderSns.length} pesanan dalam ${batches.length} batch`);

    // Proses setiap batch dan kumpulkan PDF
    const pdfBlobs: Buffer[] = [];
    
    for (const batch of batches) {
      const orderList = batch.map(orderSn => ({
        order_sn: orderSn,
        shipping_document_type: "THERMAL_AIR_WAYBILL",
        shipping_carrier: carrier
      }));

      console.log(`Memproses batch dengan ${batch.length} pesanan`);

      try {
        const response = await downloadShippingDocument(shopId, orderList);
        
        if (response instanceof Buffer) {
          pdfBlobs.push(response);
        } else {
          console.error('Response bukan Buffer:', response);
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Error saat memproses batch:', error);
        throw error;
      }

      // Delay kecil antara request
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Jika hanya ada 1 PDF, langsung kembalikan
    if (pdfBlobs.length === 1) {
      return new NextResponse(pdfBlobs[0], {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': pdfBlobs[0].length.toString(),
          'Content-Disposition': `inline; filename="shipping-labels-${Date.now()}.pdf"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Jika ada multiple PDF, gabungkan terlebih dahulu
    const pdfBlobArray = pdfBlobs.map(buffer => new Blob([buffer], { type: 'application/pdf' }));
    const mergedPDF = await mergePDFs(pdfBlobArray);
    
    return new NextResponse(mergedPDF, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="shipping-labels-${Date.now()}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error saat mengambil PDF:', error);
    return NextResponse.json(
      { error: "internal_server_error", message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
} 