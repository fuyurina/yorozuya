import requests
import json
from datetime import datetime
import time

def refresh_token():
    url = "http://localhost:10000/api/refresh_token"
    
    try:
        response = requests.post(url)
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if response.status_code == 200:
            print(f"[{current_time}] Token berhasil di-refresh")
            try:
                data = response.json()
                print("Response:", json.dumps(data, indent=2))
            except json.JSONDecodeError:
                print("Response bukan format JSON:", response.text)
        else:
            print(f"[{current_time}] Error: Status code {response.status_code}")
            print("Response:", response.text)
            
    except requests.exceptions.RequestException as e:
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{current_time}] Connection error: {str(e)}")

if __name__ == "__main__":
    # Interval dalam detik (misal: 3600 = 1 jam)
    INTERVAL = 3600
    
    print("Starting token refresh service...")
    while True:
        refresh_token()
        time.sleep(INTERVAL)