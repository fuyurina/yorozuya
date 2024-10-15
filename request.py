import requests

url = "http://localhost:3000/api/webhook"

payload = {"msg_id":"","data":{"type":"message","region":"ID","content":{"message_id":"2302748948493123953","shop_id":165103149,"request_id":"35f9478b-7482-46eb-a268-8f828fedb673","from_id":165105353,"from_user_name":"vn_cstoreponorogo","to_id":947151379,"to_user_name":"keelatofficial","message_type":"text","content":{"text":"Baik kak .. 🤗"},"conversation_id":"709122092476686867","created_timestamp":1726044721,"region":"ID","is_in_chatbot_session":False,"source_content":{},"quoted_msg":{"message_id":""},"sub_account_id":0,"sub_account_name":0}},"shop_id":947042923,"code":10,"timestamp":1726044722}


response = requests.post(url, json=payload)

if response.status_code == 200:
    print("Pesan berhasil dikirim")
    print("Respon:", response.json())
else:
    print("Gagal mengirim pesan")
    print("Status code:", response.status_code)
    print("Respon:", response.text)