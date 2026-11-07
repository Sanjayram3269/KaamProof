def worker(client,email="worker@example.com"):
 r=client.post("/api/v1/auth/register",json={"name":"Test Worker","email":email,"password":"long-test-password","language":"en"})
 assert r.status_code==200,r.text
 return {"Authorization":f"Bearer {r.json()['access_token']}"}
def payload():
 return {"customer_name":"Customer A","customer_phone":"9999999999","title":"Electrical repair","description":"Replace two switches","category":"Electrical","scope":"Replace two switches and test operation","exclusions":"Painting excluded","labour_amount":"500.00","materials_amount":"150.00"}
def test_full_customer_agreement_completion_pdf(client):
 h=worker(client);created=client.post("/api/v1/jobs",json=payload(),headers=h);assert created.status_code==200,created.text
 body=created.json();jid=body["job"]["id"];token=body["customer_url"].rsplit("/",1)[-1]
 assert body["agreement"]["version"]==1
 assert client.get(f"/api/v1/customer/{token}").status_code==200
 assert client.post(f"/api/v1/customer/{token}/decision",json={"decision":"approve","agreement_version":1}).status_code==200
 assert client.post(f"/api/v1/jobs/{jid}/events",json={"event_type":"work_started","message":"Started"},headers=h).status_code==200
 assert client.post(f"/api/v1/jobs/{jid}/completion",json={"note":"Done"},headers=h).status_code==200
 assert client.post(f"/api/v1/customer/{token}/completion-decision",json={"decision":"acknowledge"}).status_code==200
 assert client.get(f"/api/v1/jobs/{jid}",headers=h).json()["job"]["status"]=="completed"
 pdf=client.get(f"/api/v1/jobs/{jid}/pdf",headers=h);assert pdf.status_code==200 and pdf.content.startswith(b"%PDF")
def test_customer_token_invalid(client):assert client.get("/api/v1/customer/nope").status_code==404
def test_worker_cannot_read_anothers_job(client):
 h1=worker(client);jid=client.post("/api/v1/jobs",json=payload(),headers=h1).json()["job"]["id"];h2=worker(client,"other@example.com")
 assert client.get(f"/api/v1/jobs/{jid}",headers=h2).status_code==404
def test_approval_must_match_version(client):
 h=worker(client);c=client.post("/api/v1/jobs",json=payload(),headers=h);token=c.json()["customer_url"].rsplit("/",1)[-1]
 assert client.post(f"/api/v1/customer/{token}/decision",json={"decision":"approve","agreement_version":2}).status_code==409
