import requests
import json
import threading
import time
from datetime import datetime
from supabase import create_client, Client
import logging
from logging.handlers import RotatingFileHandler
import os



supabase: Client = create_client("https://jsitzrpjtdorcdxencxm.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXR6cnBqdGRvcmNkeGVuY3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ5MjEyOSwiZXhwIjoyMDQyMDY4MTI5fQ.tk5zgD7dv-LKae93N2c6Dj3cFSHtEhJYL772QeT7CIQ")

config_chat = supabase.table('settings').select('*').execute()
data = config_chat.data[0] if config_chat.data else None
if data:
    openai_api = data.get('openai_api')
    request_model = data.get('openai_model')
    temperature = data.get('openai_temperature')
    system_data = data.get('openai_prompt')
else:
    logging.warning("Data konfigurasi chatbot tidak ditemukan.")




   
    

def chatbot(conversation, user_id, ada_invoice, nomor_invoice, store_id, msg_id, user_id_int):

    if ada_invoice:
        logging.info(f"Ada invoice {nomor_invoice}")
        hasil_cek = cek_keluhan_dan_perubahan(nomor_invoice)
        logging.info(hasil_cek)

        if hasil_cek['ada_keluhan'] or hasil_cek['ada_perubahan']:
            logging.info("Ada keluhan atau perubahan yang sudah tercatat")
            return None  # Mengembalikan None jika ada keluhan atau perubahan untuk invoice yang ada
        

    # Lanjutkan dengan pemrosesan chat
    # ... (kode untuk memproses chat dengan OpenAI API)


    tools = [
        {
            "type": "function",
            "function": {
                "name": "tangani_keluhan",
                "description": "Menangani keluhan pelanggan terkait pesanan pelanggan dan menyimpannya di database",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id_pengguna": {
                            "type": "string",
                            "description": "ID pengguna pelanggan yang mengajukan keluhan"
                        },
                        "nama_toko": {
                            "type": "string",
                            "description": "Nama toko yang dikeluhkan"
                        },
                        "status_pesanan": {
                            "type": "string",
                            "description": "Status pesanan saat ini"
                        },
                        "jenis_keluhan": {
                            "type": "string",
                            "enum": [
                                "Produk Tidak Lengkap",
                                "Produk Rusak",
                                "Salah Kirim Model Pakaian",

                            ],
                            "description": "Jenis atau kategori keluhan"
                        },
                        "deskripsi_keluhan": {
                            "type": "string",
                            "description": "Deskripsi detail keluhan dari pelanggan"
                        },
                        "nomor_invoice": {
                            "type": "string",
                            "description": "Nomor invoice terkait keluhan"
                        }
                    },
                    "required": ["id_pengguna", "nama_toko", "jenis_keluhan", "deskripsi_keluhan", "nomor_invoice, status_pesanan"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "ubah_detail_pesanan",
                "description": "Mencatat permintaan perubahan detail pesanan seperti warna atau ukuran",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "id_pengguna": {
                            "type": "string",
                            "description": "ID pengguna pelanggan yang mengajukan perubahan"
                        },
                        "nama_toko": {
                            "type": "string",
                            "description": "Nama toko yang dikeluhkan"
                        },
                        "nomor_invoice": {
                            "type": "string",
                            "description": "Nomor invoice terkait perubahan"
                        },
                        "status_pesanan": {
                            "type": "string",
                            "description": "Status pesanan saat ini"
                        },
                        'detail_perubahan':{
                            "type": "string",
                            "description": "Rangkuman perubahan yang diminta"
                        },
                        "perubahan": {
                            "type": "object",
                            "properties": {
                                "warna": {
                                    "type": "string",
                                    "description": "Warna baru yang diminta jika ada perubahan"
                                },
                                "ukuran": {
                                    "type": "string",
                                    "description": "Ukuran baru yang diminta jika ada perubahan"
                                }
                            },
                            "description": "Detail perubahan yang diminta"
                        }
                    },
                    "required": ["id_pengguna", "nama_toko", "detail_perubahan", "nomor_invoice", "perubahan", "status_pesanan"]
                }
            }
        }
    ]

    data = {
        "model": request_model,
        "messages": conversation,
        "temperature": temperature,
        "tools": tools,
        "tool_choice": "auto"
    }
    max_retries = 3

    for _ in range(max_retries):
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_api}"},
            json=data
        )

        if response.status_code == 200:
            response_data = response.json()["choices"][0]['message']

            if 'tool_calls' in response_data and ada_invoice:
                for tool_call in response_data['tool_calls']:
                    if tool_call['function']['name'] == 'tangani_keluhan':
                        args = json.loads(tool_call['function']['arguments'])
                        tangani_keluhan(args['id_pengguna'], args['nama_toko'], args['jenis_keluhan'], args['deskripsi_keluhan'], args['nomor_invoice'], args['status_pesanan'], store_id, msg_id, user_id_int)
                        return f"Terima kasih telah memberi tahu kami tentang {args['jenis_keluhan']}. Kami telah mencatat keluhan Anda terkait pesanan dengan nomor invoice {nomor_invoice} dan akan menanganinya sesegera mungkin. Kakak juga bisa ajukan pengembalian lewat menu pengembalian di halaman pesanan ya kak dan mengikuti prosedur pengembalian dari Shopee."
                    elif tool_call['function']['name'] == 'ubah_detail_pesanan':
                        args = json.loads(tool_call['function']['arguments'])
                        try:
                            ubah_detail_pesanan(args['id_pengguna'], args['nama_toko'], args['nomor_invoice'], args['detail_perubahan'], args['perubahan'], args['status_pesanan'], store_id, msg_id, user_id_int)
                            return f"Terima kasih telah memberi tahu kami tentang perubahan yang Anda inginkan untuk pesanan dengan nomor invoice {args['nomor_invoice']}. Kami telah mencatat perubahan tersebut dan akan menanganinya sesegera mungkin."
                        except Exception as e:
                            logging.error(f"Terjadi kesalahan saat memasukkan data perubahan pesanan: {e}")

            return response_data['content']
        elif response.status_code == 429:
            logging.warning("OpenAI API rate limit exceeded. Skipping...")

            return None
        else:
            logging.error(f"Error while calling OpenAI API: {response.status_code}, {response.text}")
            logging.info("Retrying...")
            time.sleep(5)

    logging.error(f"Failed after {max_retries} attempts")
    return None

def reply_to_chat(chat, reply_text):
    url = "https://yorozuya.onrender.com/api/msg/send_message"
    
    payload = {
        "toId": int(chat['mp_buyer_id']),  # Konversi ke integer
        "messageType": "text",
        "content": reply_text,
        "shopId": int(chat['mp_store_id'])  # Konversi ke integer
    }

    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        logging.info(f"Pesan berhasil dikirim ke user {chat['mp_buyer_id']}")
        return response
    except requests.RequestException as e:
        logging.error(f"Gagal mengirim pesan: {e}")
        if hasattr(e.response, 'text'):
            logging.error(f"Response error: {e.response.text}")
        return None

def box_exec(chat, headers):
    # Mengambil percakapan dari API baru
    userchat = f"https://yorozuya.onrender.com/api/msg/get_message?conversationId={chat['conversation_id']}&shopId={chat['shop_id']}&pageSize=25"
    rawconv = requests.get(userchat)

    if rawconv.status_code != 200:
        logging.error(f"Gagal mengambil percakapan. Kode status: {rawconv.status_code}")
        return

    try:
        conv_data = rawconv.json()
        messages = conv_data['response']['messages']
    except (requests.exceptions.JSONDecodeError, KeyError) as e:
        logging.error(f"Gagal mendekode respons JSON dari API percakapan: {e}")
        return

    percakapan = [
        {"role": "system", "content": system_data}
    ]

    data_pesanan = ambil_data_pesanan_shopee(chat['to_id'])

    ada_invoice = False
    nomor_invoice = None
    status_pesanan = None
    store_id = chat.get('shop_id')
    msg_id = chat.get('latest_message_id')
    store_name = chat.get('shop_name')
    user_id = chat.get('to_id')

    if data_pesanan and 'data' in data_pesanan and len(data_pesanan['data']) > 0:
        pesanan = data_pesanan['data'][0]
        ada_invoice = True
        nomor_invoice = pesanan.get('invoice_no')
        status_pesanan = pesanan.get('mp_order_status')

    if ada_invoice:
        percakapan.append({
            "role": "system",
            "content": f"Nama toko saat ini adalah {store_name} dan ID pelanggan adalah {chat['to_name']}. "
                      f"Pelanggan memiliki pesanan dengan nomor invoice {nomor_invoice} dengan status pesanan {status_pesanan}."
        })
    else:
        percakapan.append({
            "role": "system",
            "content": f"Nama toko saat ini adalah {store_name} dan ID pelanggan adalah {chat['to_name']}. "
                      f"Pelanggan belum memiliki pesanan. Jangan memproses keluhan atau ubah pesanan formal, tetapi tetap bantu dengan informasi umum jika diperlukan."
        })

    # Memproses pesan-pesan dari respons API baru
    for message in messages:
        if message.get('content', {}).get('text'):
            peran = "user" if message['from_shop_id'] != store_id else "assistant"
            percakapan.append({
                "role": peran, 
                "content": message['content']['text']
            })

    teks_balasan = chatbot(percakapan, chat['to_name'], ada_invoice, nomor_invoice, store_id, msg_id, int(user_id))

    if teks_balasan is not None:
        logging.info(f"PEMBELI : {chat['latest_message_content']['text']}")
        logging.info(f"RESPOND AI: {teks_balasan}")
        
        chat_data = {
            'marketplace': 'shopee',
            'mp_store_id': str(store_id),
            'mp_msg_id': msg_id,
            'mp_buyer_id': str(user_id),
            'chat_code': chat['conversation_id'],
            'message': teks_balasan,
            'type': 'text'
        }
        
        respon = reply_to_chat(chat_data, teks_balasan)
        try:
            logging.info(f"BD respon balasan: {respon.json()}")
        except requests.exceptions.JSONDecodeError:
            logging.error(f"Gagal mendekode respons JSON. Status code: {respon.status_code}")
            logging.error(f"Isi respons: {respon.text}")
    else:
        if ada_invoice:
            logging.info(f"Tidak ada balasan yang dikirim karena keluhan atau perubahan sudah ada untuk invoice: {nomor_invoice}, Status pesanan: {status_pesanan}")
        else:
            logging.info("Tidak ada invoice yang terkait dengan pengguna ini. Chat diproses normal.")

def send_replies():
    try:
        # Mengubah endpoint untuk mengambil data chat
        datachat = requests.get("http://localhost:3000/api/msg/get_conversation_list?limit=20")
        chats = datachat.json()
        
        logging.info(f"Total chats to reply: {len(chats)}")

        threads = []
        for chat in chats:
            # Menyesuaikan struktur data chat yang baru
            if chat.get('latest_message_content') and chat['latest_message_content'].get('text'):
                chat_data = {
                    'marketplace': 'shopee',  # Asumsi marketplace tetap shopee
                    'mp_store_id': str(chat['shop_id']),
                    'mp_msg_id': chat['latest_message_id'],
                    'mp_buyer_id': str(chat['to_id']),
                    'chat_code': chat['conversation_id'],
                    'message': chat['latest_message_content']['text'],
                    'full_name': chat['to_name'],
                    'store': {
                        'store_name': chat['shop_name']
                    }
                }
                
                thread = threading.Thread(target=box_exec, args=(chat_data))
                thread.start()
                threads.append(thread)
            else:
                logging.info(f"Chat tidak memiliki pesan: {chat}")
                
        for thread in threads:
            thread.join()
            
    except Exception as e:
        logging.error(f"Terjadi kesalahan saat mengambil atau memproses chat: {e}")

def tangani_keluhan(id_pengguna: str, nama_toko: str, jenis_keluhan: str, deskripsi_keluhan: str, nomor_invoice: str, status_pesanan: str, store_id: str, msg_id: str, user_id: int):
    try:
        # Memasukkan data keluhan ke Supabase
        result = supabase.table('keluhan').upsert({
            "id_pengguna": id_pengguna,
            "nama_toko": nama_toko,
            "jenis_keluhan": jenis_keluhan,
            "deskripsi_keluhan": deskripsi_keluhan,
            "nomor_invoice": nomor_invoice,
            "status_pesanan": status_pesanan,
            "store_id": store_id,
            "msg_id": msg_id,
            "user_id": user_id
        }, on_conflict=['nomor_invoice']).execute()

        logging.info(f"Data keluhan berhasil dimasukkan: {result.data}")
        return True
    except Exception as e:
        logging.error(f"Terjadi kesalahan saat memasukkan data keluhan: {e}")
        return False


def cek_keluhan_dan_perubahan(nomor_invoice: str):
    try:
        # Memeriksa keluhan
        keluhan_result = supabase.table('keluhan').select('*').eq('nomor_invoice', nomor_invoice).execute()
        logging.info(f"Keluhan result: {keluhan_result}")
        # Memeriksa perubahan pesanan
        perubahan_result = supabase.table('perubahan_pesanan').select('*').eq('nomor_invoice', nomor_invoice).execute()
        logging.info(f"Perubahan result: {perubahan_result}")
        ada_keluhan = len(keluhan_result.data) > 0
        ada_perubahan = len(perubahan_result.data) > 0

        return {
            "ada_keluhan": ada_keluhan,
            "ada_perubahan": ada_perubahan
        }
    except Exception as e:
        logging.error(f"Terjadi kesalahan saat memeriksa keluhan dan perubahan pesanan: {e}")
        return {
            "ada_keluhan": False,
            "ada_perubahan": False
        }

def ubah_detail_pesanan(id_pengguna: str, nama_toko: str, nomor_invoice: str, detail_perubahan: str, perubahan: dict, status_pesanan: str,store_id:str, msg_id:str, user_id:int):
    try:
        # Memasukkan data perubahan pesanan ke Supabase
        result = supabase.table('perubahan_pesanan').upsert({
            "id_pengguna": id_pengguna,
            "nama_toko": nama_toko,
            "nomor_invoice": nomor_invoice,
            "detail_perubahan": detail_perubahan,
            "perubahan": perubahan,
            "status_pesanan": status_pesanan,
            "store_id": store_id,
            "msg_id": msg_id,
            "user_id": user_id
        }, on_conflict=['nomor_invoice']).execute()
        logging.info(f"Data perubahan pesanan berhasil dimasukkan: {result.data}")
        return True
    except Exception as e:
        logging.error(f"Terjadi kesalahan saat memasukkan data perubahan pesanan: {e}")
        return False

def ambil_data_pesanan_shopee(user_id: str) -> dict:

    url = f"https://app.bantudagang.com/api/order/customer/shopee/{user_id}"

    try:
        response = requests.get(url)
        response.raise_for_status()
        if response.status_code == 200:
            return response.json()
        else:
            logging.error(f"Gagal mengambil data pesanan. Kode status: {response.status_code}")
            return None

    except requests.RequestException as e:
        logging.error(f"Terjadi kesalahan saat mengambil data pesanan: {e}")
        return None


def setup_logging():
    log_directory = 'logs'
    if not os.path.exists(log_directory):
        os.makedirs(log_directory)

    log_file = os.path.join(log_directory, 'chatbot.log')

    handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)

def main():
    setup_logging()
    logging.info("==========================================Program dimulai==========================================")
    process_orders()
    send_replies()
    logging.info("==========================================Program selesai==========================================")

if __name__ == "__main__":
    print("Mulai menjalankan program...")
    main()
