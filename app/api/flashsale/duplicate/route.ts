import { NextRequest, NextResponse } from 'next/server';
import { getShopFlashSaleItems } from '@/app/services/shopeeFlashSaleService';

interface FlashSaleItem {
  item_id: number;
  item_name: string;
  image: string;
  status: number;
}

interface FlashSaleModel {
  model_id: number;
  model_name: string;
  item_id: number;
  original_price: number;
  input_promotion_price: number;
  campaign_stock: number;
  status: number;
}

interface DuplicationProgress {
  flash_sale_id: number;
  timeslot_id: number;
  total_items: number;
  successful_items: number;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_id, flash_sale_id, timeslot_ids } = body;

    if (!shop_id || !flash_sale_id || !timeslot_ids || !Array.isArray(timeslot_ids)) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Parameter shop_id, flash_sale_id, dan timeslot_ids diperlukan' 
        },
        { status: 400 }
      );
    }

    const detailResponse = await getShopFlashSaleItems(shop_id, flash_sale_id);
    if (!detailResponse.success) {
      return NextResponse.json({
        success: false,
        message: 'Gagal mengambil detail flash sale'
      }, { status: 400 });
    }

    const duplicatedFlashSales = [];
    const failedDuplications = [];

    // Gunakan Response Stream untuk mengirim progress
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Kirim response awal
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    // Proses duplikasi
    (async () => {
      try {
        for (let i = 0; i < timeslot_ids.length; i++) {
          const timeslot_id = timeslot_ids[i];
          
          // Kirim status awal untuk slot ini
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                progress: {
                  current: i,
                  total: timeslot_ids.length,
                  status: `Membuat flash sale untuk slot ${i + 1}/${timeslot_ids.length}...`
                }
              })}\n\n`
            )
          );

          try {
            const createResponse = await fetch(`${request.nextUrl.origin}/api/flashsale/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop_id, timeslot_id })
            });

            const createData = await createResponse.json();
            
            if (createData.success) {
              const newFlashSaleId = createData.data.flash_sale_id;
              let items = [];

              // Kirim status pembuatan flash sale berhasil
              await writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    progress: {
                      current: i,
                      total: timeslot_ids.length,
                      status: `Flash Sale #${newFlashSaleId} berhasil dibuat, mendaftarkan items...`,
                      detail: {
                        flash_sale_id: newFlashSaleId,
                        timeslot_id: timeslot_id
                      }
                    }
                  })}\n\n`
                )
              );

              // Proses items
              if (detailResponse.data?.items && detailResponse.data?.models) {
                items = detailResponse.data.items.map((item: FlashSaleItem) => {
                  const itemModels = detailResponse.data.models
                    .filter((model: FlashSaleModel) => 
                      model.item_id === item.item_id && 
                      model.campaign_stock > 0
                    );
                  
                  if (itemModels.length === 0) return null;

                  return {
                    item_id: item.item_id,
                    purchase_limit: 0,
                    models: itemModels.map((model: FlashSaleModel) => ({
                      model_id: model.model_id,
                      input_promo_price: model.input_promotion_price,
                      stock: model.campaign_stock
                    }))
                  };
                }).filter(Boolean);

                // Kirim status jumlah item yang akan didaftarkan
                await writer.write(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      progress: {
                        current: i,
                        total: timeslot_ids.length,
                        status: `Mendaftarkan ${items.length} items ke Flash Sale #${newFlashSaleId}...`,
                        detail: {
                          flash_sale_id: newFlashSaleId,
                          total_items: items.length
                        }
                      }
                    })}\n\n`
                  )
                );

                const addResponse = await fetch(`${request.nextUrl.origin}/api/flashsale/items/add`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    shop_id,
                    flash_sale_id: newFlashSaleId,
                    items
                  })
                });

                const addData = await addResponse.json();

                if (addData.success) {
                  duplicatedFlashSales.push({
                    timeslot_id,
                    flash_sale_id: newFlashSaleId,
                    total_items: items.length,
                    successful_items: items.length
                  });

                  // Kirim status berhasil
                  await writer.write(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        progress: {
                          current: i + 1,
                          total: timeslot_ids.length,
                          status: `Berhasil mendaftarkan ${items.length} items ke Flash Sale #${newFlashSaleId}`,
                          detail: {
                            flash_sale_id: newFlashSaleId,
                            total_items: items.length,
                            successful_items: items.length
                          }
                        }
                      })}\n\n`
                    )
                  );
                } else {
                  failedDuplications.push({
                    timeslot_id,
                    flash_sale_id: newFlashSaleId,
                    error: 'Gagal menambahkan items'
                  });
                }
              }
            } else {
              failedDuplications.push({
                timeslot_id,
                error: 'Gagal membuat flash sale'
              });
            }
          } catch (error) {
            failedDuplications.push({
              timeslot_id,
              error: 'Error saat proses duplikasi'
            });
          }
        }

        // Kirim ringkasan akhir
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              success: true,
              data: {
                duplicated_flash_sales: duplicatedFlashSales,
                failed_duplications: failedDuplications,
                summary: {
                  total_slots: timeslot_ids.length,
                  successful_slots: duplicatedFlashSales.length,
                  failed_slots: failedDuplications.length,
                  total_items: duplicatedFlashSales.reduce((sum, fs) => sum + fs.total_items, 0),
                  successful_items: duplicatedFlashSales.reduce((sum, fs) => sum + fs.successful_items, 0)
                }
              }
            })}\n\n`
          )
        );
      } finally {
        await writer.close();
      }
    })();

    return response;

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan internal server'
      },
      { status: 500 }
    );
  }
} 