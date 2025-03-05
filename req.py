import requests
import json
import time
from datetime import datetime

# URL webhook Anda
WEBHOOK_URL = "https://yorozuya.shop/api/webhook"

def send_webhook(data):
    """
    Fungsi untuk mengirim webhook dan menampilkan hasilnya
    """
    try:
        print("\n------ Mengirim Webhook ------")
        print("Waktu:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("Data:", json.dumps(data, indent=2))
        
        response = requests.post(
            WEBHOOK_URL,
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print("\nResponse:")
        print("Status Code:", response.status_code)
        try:
            print("Response Body:", json.dumps(response.json(), indent=2))
        except:
            print("Response Body:", response.text)
        
        print("Response Time:", response.elapsed.total_seconds(), "seconds")
        print("-" * 50)
        
        return response
        
    except requests.exceptions.Timeout:
        print("ERROR: Request timeout")
    except requests.exceptions.RequestException as e:
        print("ERROR:", str(e))
    except Exception as e:
        print("ERROR:", str(e))

def test_verification():
    """
    Test verifikasi webhook
    """
    data = {
        "code": 0,
        "data": {
            "verify_info": "This is a Verification message.Please respond in the certain format."
        }
    }
    return send_webhook(data)

def test_order_status():
    """
    Test webhook order status
    """
    data = {
        "code": 3,
        "data": {
            "ordersn": "TEST" + datetime.now().strftime("%Y%m%d%H%M%S"),
            "shop_id": 123456,
            "status": "READY_TO_SHIP",
            "update_time": int(time.time()),
            "buyer_username": "test_buyer",
            "total_amount": 100000,
            "sku": "TEST-SKU-001"
        }
    }
    return send_webhook(data)

def test_chat():
    """
    Test webhook chat
    """
    data = {
        "code": 10,
        "shop_id": 123456,
        "data": {
            "type": "message",
            "content": {
                "message_type": "text",
                "conversation_id": "test_conv_" + datetime.now().strftime("%Y%m%d%H%M%S"),
                "message_id": "test_msg_" + datetime.now().strftime("%Y%m%d%H%M%S"),
                "from_id": "seller_123",
                "from_user_name": "Seller Test",
                "to_id": "buyer_123",
                "to_user_name": "Buyer Test",
                "content": "Ini adalah pesan test",
                "created_timestamp": int(time.time())
            }
        }
    }
    return send_webhook(data)

def test_tracking_update():
    """
    Test webhook tracking update
    """
    data = {
        "code": 4,
        "data": {
            "ordersn": "TEST" + datetime.now().strftime("%Y%m%d%H%M%S"),
            "shop_id": 123456,
            "tracking_number": "TRACK123456",
            "status": "PICKUP_DONE",
            "update_time": int(time.time())
        }
    }
    return send_webhook(data)

def run_all_tests():
    """
    Jalankan semua test
    """
    tests = [
        ("Verification Test", test_verification),
        ("Order Status Test", test_order_status),
        ("Chat Test", test_chat),
        ("Tracking Update Test", test_tracking_update)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\nMenjalankan {test_name}")
        print("=" * 50)
        response = test_func()
        results.append({
            "test": test_name,
            "status": response.status_code if response else "Failed",
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })
        time.sleep(2)  # Tunggu 2 detik antara setiap test
    
    print("\n\nRingkasan Hasil Test:")
    print("=" * 50)
    for result in results:
        status = "✅ Success" if result["status"] == 200 else "❌ Failed"
        print(f"{result['test']}: {status} ({result['status']})")

if __name__ == "__main__":
    while True:
        print("\nMenu Test Webhook:")
        print("1. Test Verifikasi")
        print("2. Test Order Status")
        print("3. Test Chat")
        print("4. Test Tracking Update")
        print("5. Jalankan Semua Test")
        print("0. Keluar")
        
        choice = input("\nPilih test (0-5): ")
        
        if choice == "1":
            test_verification()
        elif choice == "2":
            test_order_status()
        elif choice == "3":
            test_chat()
        elif choice == "4":
            test_tracking_update()
        elif choice == "5":
            run_all_tests()
        elif choice == "0":
            print("Program selesai")
            break
        else:
            print("Pilihan tidak valid")
        
        input("\nTekan Enter untuk melanjutkan...")