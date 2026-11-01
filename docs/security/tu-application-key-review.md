# TU Application-Key security review

ตรวจการใช้ `TU_AUTH_APPLICATION_KEY` เมื่อ 1 พ.ย. 2026 ทั้งจากโค้ดและการเรียก `https://restapi.tu.ac.th/api/v1/auth/Ad/verify` จริง โดยใช้แค่บัญชีที่ไม่มีอยู่จริง (ไม่ได้ใช้บัญชี TU ของใคร) ใน QA stack ที่รันโหมด `TU_AUTH_MODE=real` เอกสารนี้ไม่มีค่าของ key

## ผลการเรียก TU จริง

| เรียกด้วย | ผล |
|---|---|
| key ของโครงการ + บัญชีปลอม | 400 `{"status":false,"message":"Users or Password Invalid!","Description":…}` → **key ใช้งานได้** |
| key ปลอม หรือไม่ส่ง key | 403 `invalid token` |
| ผ่าน TU-ClubHub ด้วยบัญชีปลอม | 401 `AUTHENTICATION_FAILED` (หลังแก้ `106ab90`) |
| ผ่าน TU-ClubHub ด้วย key ผิด | 503 `AUTH_PROVIDER_UNAVAILABLE` ไม่ส่งข้อความของ TU ต่อ และ log บันทึกว่า "refused the Application-Key (HTTP 403)" |
| บัญชี mock (`student-demo`) ในโหมด real | 401 |
| บัญชีปลอมเดียวกันครั้งที่ 1–2 (ตั้ง limit ทดสอบไว้ 2 ครั้ง/username, 4 ครั้ง/client) | 401 ทั้งสองครั้ง และ log ของ adapter มี 2 บรรทัด |
| ครั้งที่ 3, ครั้งที่ 4 ที่ปลอม `X-Forwarded-For` และ username ใหม่จาก client เดิม | 429 `RATE_LIMITED` พร้อม `Retry-After` (900 / 900 / 600 วินาที) โดยไม่ได้เรียก TU เลย (log ของ adapter ยังเป็น 2 บรรทัด) |

## ที่ผ่าน

- key อยู่ใน header `Application-Key` เท่านั้น และส่งไปที่ endpoint ที่ตั้งค่าไว้ ซึ่งต้องเป็น HTTPS (`TuAuthClientConfiguration` ไม่ยอม start ถ้าไม่ใช่) และ HTTP client ไม่ตาม redirect
- ตั้ง timeout ไว้ที่ 3 s (เชื่อมต่อ) และ 5 s (อ่าน) ส่วนโหมด mock จะไม่ยอมทำงานภายใต้ profile `prod`
- ไม่มี key อยู่ใน repo และประวัติ git ทุก commit (ค้นหาแบบ pattern แล้ว) มีแต่ `.env.example` ที่ว่างไว้ ส่วน `.env` อยู่ใน `.gitignore` และเทสต์ใช้ key ปลอม
- frontend ไม่มีตัวแปรหรือการอ้างถึง key และ actuator เปิดแค่ `health`
- ใน log ของ app หลังทดสอบจริงไม่พบ key, username หรือ password และ response ของ app ไม่มี key
- หลังทดสอบได้สลับ QA stack กลับเป็นโหมด mock แล้ว และตรวจแล้วว่าทั้ง container และ `.env` ของ QA ไม่มี key

## ข้อที่พบ

| # | ระดับ | ข้อที่พบ | สถานะ |
|---:|---|---|---|
| 1 | สูง | TU จริงตอบรหัสผ่านผิดด้วยข้อความ `Users or Password Invalid!` แต่โค้ดเทียบกับ `User or Password Invalid!` แบบตรงตัว ทำให้รหัสผ่านผิดทุกครั้งกลายเป็น 500 `INTERNAL_ERROR` | **แก้แล้ว** `106ab90` |
| 2 | สูง | `POST /api/v1/auth/login` ไม่มี rate limit ทุกคำขอเรียก TU ด้วย key ของโครงการ ใครก็ได้ที่ขอ CSRF token จึงยิงจนเต็มโควตา 1,000 ครั้ง/ชม./key (`TU_API.md` §2.3) ทำให้ login ใช้ไม่ได้ทั้งระบบ และใช้ระบบเราเป็นช่องทางสุ่มรหัสผ่านกับ TU ได้ | **แก้แล้ว** `5ec9968` นับครั้งต่อ client address และต่อ username ก่อนเรียก TU (ค่าเริ่มต้น 50 ครั้ง/10 นาที และ 5 ครั้ง/15 นาที) แล้วตอบ `429 RATE_LIMITED` พร้อม `Retry-After` ทั้งนี้ไม่เชื่อ `X-Forwarded-For` เพราะ deploy แบบปกติเปิด app ตรงๆ จึงปลอม header ได้ ข้อจำกัดคือตัวนับอยู่ในหน่วยความจำของ instance เดียว และถ้าใช้ profile `split` ที่มี nginx อยู่หน้า app ทุก client จะใช้ address เดียวกัน |
| 3 | กลาง | key ถูกส่งในแชตกับ AI จึงถูกบันทึกอยู่ใน transcript บนเครื่องผู้พัฒนา | เจ้าของ key ควรออก key ใหม่ที่ <https://restapi.tu.ac.th/tuapi/Authkey> ก่อนใช้งานจริง และไม่ส่ง secret ผ่านแชต, Trello หรือ LINE |
| 4 | ต่ำ | `.env` ในเครื่องผู้พัฒนาตั้งสิทธิ์เป็น 644 (ผู้ใช้อื่นในเครื่องอ่านได้) | ปรับเป็น 600 แล้ว |
| 5 | ต่ำ | `docker inspect` แสดงค่า key ให้ทุกคนที่อยู่ในกลุ่ม docker | ยอมรับได้สำหรับเครื่อง demo ส่วน production ควรใช้ secret ของ platform เช่น environment ของ Render |
| 6 | ต่ำ | ไม่ได้ล็อก host ของ endpoint ไว้ ถ้าตั้งค่าผิดจะส่ง key ไป host อื่นที่เป็น HTTPS | **แก้แล้ว** `23a1d67` โหมด real รับเฉพาะ `https://restapi.tu.ac.th` ที่ port ปกติ และไม่มี userinfo ถ้าไม่ตรงจะไม่ยอม start |

## ยังไม่ได้ทดสอบ

Login สำเร็จด้วยบัญชี TU จริง ซึ่งเจ้าของบัญชีต้องเป็นคนทดสอบเองผ่านหน้า `/login` ห้ามส่งรหัสผ่านให้คนอื่นหรือใส่ในแชต
