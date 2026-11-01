# Task48:U03-QA-1 — U03 end-to-end flow in the browser

Flow: edit the club profile → create a round → set its questions → view the club → submit an application. Run on 2026-11-01 in Chromium (Playwright, headless) against the [Task47 deployment](task47-deployment-report.md) (`http://localhost:18080`, commit `ad2468a`, seeded data). Accounts: `student-demo` is president of ชมรมเขียนโปรแกรม (club 3); `applicant-demo` is a student with no memberships. Each step also checked the database where noted.

| # | Step | Result |
|---:|---|---|
| 1 | `student-demo` logs in at `/login` | PASS |
| 2 | `/clubs/3/edit`: change the description, save | PASS: "อัปเดตข้อมูลชมรมสำเร็จเรียบร้อย" |
| 3 | `/clubs/3/rounds/new`: title, description, opens 1 h ago, closes in 7 days, confirmation deadline in 14 days, two questions in the form, "บันทึกและเผยแพร่" | PASS: the round is PUBLISHED with 2 questions |
| 4 | `/clubs/3` shows the new round and the edited description | PASS |
| 5 | `applicant-demo` logs in, clicks "สมัครเข้าร่วมชมรมนี้", fills the motivation, both answers and a link with surrounding spaces, reviews and submits | PASS: success dialog "ส่งใบสมัครสำเร็จ · SUBMITTED"; database has one `SUBMITTED` application, 2 answers, the trimmed link and one initial history row |
| 6 | Round closes while the form is open: the president closes it through the API, then the applicant submits | PASS: 409 `ROUND_CLOSED`, the form shows "รอบรับสมัครนี้ปิดรับใบสมัครแล้ว", no application saved |
| 7 | Submit to the round from step 5 again | PASS: "คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว", still one application |
| 8 | Empty motivation, an `http://` link and a link over 2,048 characters | PASS: motivation error and both link errors; nothing sent |
| 9 | `/clubs/3/rounds/999999999/apply` | PASS: "ไม่พบข้อมูลที่ต้องการ" |
| 10 | Form of a published round that opens tomorrow | PASS: "รอบรับสมัครนี้ยังไม่เปิดรับใบสมัคร" |
| 11 | `student-demo`, a member of club 3, submits to its round | PASS: "คุณเป็นสมาชิกปัจจุบันของชมรมนี้อยู่แล้ว" |
| 12 | Open an application form after logging out | PASS: redirected to `/login?next=…` |

## Defects found and fixed during the run

| Defect | Fix |
|---|---|
| With `PORT` other than 8080, the Compose app was unreachable | `4d32b77` |
| A 409 on the form showed the API's English text ("The application conflicts with the current state.") instead of the reason | `16449c0`: Thai message per reason |
| A link with surrounding spaces was rejected although it is trimmed before sending | `8e46621` |

## Notes

- Publishing a draft after editing its questions on the questions page is not possible in the UI yet (no round read API for the version), so step 3 sets the questions in the round form and publishes from there.
- The round form's two sample questions name another club (ชมรมอาสาพัฒนา); the president should replace them.
- The browser script and screenshots are kept outside the repository, so no browser dependency is added. Each step above can be repeated by hand with the same accounts.
