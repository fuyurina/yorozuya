import { NextRequest, NextResponse } from 'next/server';
import { downloadShippingDocument, createShippingDocument, getTrackingNumber as getShopeeTrackingNumber } from '@/app/services/shopeeService';
import { mergePDFs } from '@/app/utils/pdfUtils';

const BATCH_SIZE = 50; // Batasan dari Shopee API

// Definisikan interface untuk order list
interface OrderItem {
  order_sn: string;
  shipping_document_type: string;
  shipping_carrier: string | null;
}

interface CreateDocumentItem {
  order_sn: string;
  tracking_number?: string;
}

// Fungsi helper untuk mendapatkan tracking number
async function getOrderTrackingNumber(shopId: number, orderSn: string): Promise<string | null> {
  const response = await getShopeeTrackingNumber(shopId, orderSn);
  
  if (response?.response?.tracking_number) {
    return response.response.tracking_number;
  }
  return null;
}

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
      const orderList: OrderItem[] = batch.map(orderSn => ({
        order_sn: orderSn,
        shipping_document_type: "THERMAL_AIR_WAYBILL",
        shipping_carrier: carrier
      }));

      console.log(`Memproses batch dengan ${batch.length} pesanan`);

      try {
        // Coba download dokumen
        const response = await downloadShippingDocument(shopId, orderList);
        
        // Jika terjadi error dokumen belum dibuat
        if (response.error === 'logistics.shipping_document_should_print_first') {
          console.log('Dokumen belum dibuat, mencoba membuat dokumen...');
          
          for (const order of orderList) {
            try {
              // Dapatkan tracking number menggunakan fungsi helper yang baru
              const trackingNumber = await getOrderTrackingNumber(shopId, order.order_sn);
              
              if (!trackingNumber) {
                throw new Error(`Tracking number tidak ditemukan untuk order ${order.order_sn}`);
              }

              console.log(`Creating document for order ${order.order_sn} with tracking number ${trackingNumber}`);

              await createShippingDocument(shopId, [{
                order_sn: order.order_sn,
                tracking_number: trackingNumber
              }]);

            } catch (error) {
              console.error(`Error saat memproses order ${order.order_sn}:`, error);
              throw error;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryResponse = await downloadShippingDocument(shopId, orderList);
          
          if (retryResponse instanceof Buffer) {
            pdfBlobs.push(retryResponse);
          } else {
            throw new Error('Masih gagal setelah membuat dokumen');
          }
        } else if (response instanceof Buffer) {
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