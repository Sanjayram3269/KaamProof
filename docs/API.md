# API contract

Base path: /api/v1. Worker routes use Authorization: Bearer <access_token>.

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/register | Create worker |
| POST | /auth/login | Obtain access token |
| GET | /auth/me | Current worker |
| GET | /dashboard | Worker summary |
| GET, POST | /jobs | List/create jobs |
| GET | /jobs/{job_id} | Job, agreements, evidence, timeline |
| POST | /jobs/{job_id}/agreements | New immutable agreement version |
| POST | /jobs/{job_id}/events | Add timeline event |
| POST | /jobs/{job_id}/evidence | Upload image evidence |
| POST | /jobs/{job_id}/completion | Submit completion |
| GET | /jobs/{job_id}/pdf | Download PDF |
| POST | /jobs/{job_id}/customer-link | Rotate customer link |
| GET | /customer/{token} | Customer view |
| POST | /customer/{token}/decision | Approve/reject exact agreement version |
| POST | /customer/{token}/completion-decision | Acknowledge/dispute completion |
| POST | /jobs/{job_id}/payments | Record worker-reported payment |

Money uses decimal values. Customer links are bearer credentials and do not establish civil identity. Acknowledgements are not legal adjudications.
