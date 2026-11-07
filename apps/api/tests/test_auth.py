def test_duplicate_and_invalid_login(client):
 p={"name":"Worker One","email":"one@example.com","password":"a-long-enough-password"}
 assert client.post("/api/v1/auth/register",json=p).status_code==200
 assert client.post("/api/v1/auth/register",json=p).status_code==409
 assert client.post("/api/v1/auth/login",json={"email":"one@example.com","password":"incorrect-password"}).status_code==401
