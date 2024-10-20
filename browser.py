import http.client

conn = http.client.HTTPSConnection("localhost", 8848)
payload = ''
headers = {
   'User-Agent': 'Apidog/1.0.0 (https://apidog.com)'
}
conn.request("GET", "/api/agent/profile/list?page=&pageSize=&s=&tags=null&groupId=", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))