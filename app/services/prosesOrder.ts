import { processReadyToShipOrders, createShippingDocument } from "@/app/services/shopeeService";

export async function prosesOrder(shopId: number, orderSn: string, shippingMethod: string = 'dropoff'): Promise<any> {
    // Menambahkan delay 6 detik
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const shipResult = await processReadyToShipOrders(shopId, orderSn, shippingMethod);
    
    if (shipResult.success) {
        // Jika pengiriman berhasil, buat dokumen pengiriman
        const orderList = [{
            order_sn: orderSn
        }];
        const documentResult = await createShippingDocument(shopId, orderList);
        return { shipResult, documentResult };
    }
    
    return shipResult;
}
