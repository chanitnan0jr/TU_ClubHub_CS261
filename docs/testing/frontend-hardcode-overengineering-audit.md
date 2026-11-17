# รายงานตรวจ Frontend: Hard-code และความซับซ้อน

วันที่ตรวจ: 17 พฤศจิกายน 2026 · ฐาน Git: `main` / `e1cc107` · สถานะ: ข้อเสนอสำหรับตรวจและวางแผน

## ความคืบหน้าการแก้ไข

- แก้ mapper ให้เก็บ `maxLength` ของคำถามเดิมผ่านการโหลด แก้ไข และเรียงลำดับ; คำถามใหม่ยังใช้ 2000 และเพิ่ม regression test ระดับ mapper และหน้า edit ที่ตรวจ PUT payload แล้ว ยังไม่ได้ทดสอบกับ backend/database
- หน้าค้นหาชมรมใช้ผล API โดยไม่กรองซ้ำ และเลือกหมวดด้วย ID; เพิ่ม component test ตรวจผลที่ server ส่งมาแม้ข้อความไม่ตรงชื่อหรือรายละเอียด
- หน้าประวัติระบุขอบเขตจำนวนและตัวกรองว่าเฉพาะหน้าปัจจุบันเมื่อมีหลายหน้า และข้อความไม่พบระบุหน้าปัจจุบัน; ยังไม่รองรับการกรองทั้งชุด เพราะ API ที่ระบุใน OpenAPI ยังไม่มี filter สถานะ
- รายการอื่นด้านล่างยังเป็นข้อค้นพบ/แผน ไม่ถือว่าเป็นบั๊กเมื่อเป็นพฤติกรรมที่ตรงเอกสาร โดยเฉพาะ timezone ซึ่งยังต้องยืนยัน contract

## ขอบเขตและวิธีตรวจ

สำรวจ frontend ทั้งต้นไม้ รวม 95 ไฟล์ TypeScript/TSX ใน `frontend/src` ตลอดจน config, dependencies และ tests โดยค้นหารูปแบบค่าคงที่ การเรียก API การจัดการ state และการอ้างอิงไฟล์ แล้วอ่านจุดที่มีความเสี่ยงเทียบกับ contract และ tests นี่เป็น static audit ไม่ใช่การทดสอบทุก flow ในเบราว์เซอร์ หรือการรับรองว่าไม่มีบั๊ก

Working tree มีการเปลี่ยนแปลงที่ยังไม่ commit อยู่ก่อนตรวจ รวม `ClubSearchPage.tsx`, `RecruitmentRoundForm.tsx`, `AuthContext.tsx`, `App.tsx`, `validation.ts` และ `DevRoleSwitcherPill.tsx` ที่ยังไม่ถูกติดตาม ผลด้านล่างอ้างอิงสภาพ working tree ปัจจุบัน ไม่ใช่ commit อย่างเดียว ต้องตรวจ diff อีกครั้งก่อนแก้

ลำดับ: P1 = เสี่ยงกระทบข้อมูลหรือความเข้าใจผู้ใช้; P2 = ควรปรับเมื่อยืนยัน contract; P3 = ลดภาระดูแล ค่าคงที่บางอย่างเป็น UI choice หรือกฎ contract ที่เหมาะสม ไม่จำเป็นต้องย้ายเป็น configuration

## รายการที่พบ

### P1 — กรองและนับใบสมัครเฉพาะหน้าที่โหลด

- หลักฐาน: [`MyApplicationsPage.tsx:67`](../../frontend/src/features/applications/pages/MyApplicationsPage.tsx#L67) ดึงทีละหน้า; [บรรทัด 107–120](../../frontend/src/features/applications/pages/MyApplicationsPage.tsx#L107) กรองและนับจาก `items` หน้าปัจจุบัน แต่ยอดทั้งหมดใช้ `meta.totalElements`; [บรรทัด 188](../../frontend/src/features/applications/pages/MyApplicationsPage.tsx#L188) แจ้งไม่พบสถานะที่เลือก
- ผล: เมื่อมีหลายหน้า ผู้ใช้อาจเห็นจำนวนแต่ละสถานะไม่ครบและคิดว่าไม่มีใบสมัครสถานะนั้น ทั้งที่อยู่หน้าอื่น นี่เป็นข้อค้นพบจากการอ่านโค้ด ยังไม่ได้จำลองหลายหน้าบน browser
- แผน: ตรวจ Story/API ว่าต้องกรองและนับทั้งชุดหรือไม่ หากใช่ให้กำหนด server-side filter และ aggregate ร่วมกับ BE/contract; ระหว่างรอให้ระบุให้ชัดว่า filter/count จำกัดเฉพาะหน้านี้หาก PO ยอมรับ อย่าโหลดทุกหน้าแบบไม่มีขอบเขตเอง ทดสอบข้อมูลมากกว่า page size โดยผลที่ค้นหาอยู่หน้าถัดไป

### P1 — แก้รอบแล้วอาจเปลี่ยน maxLength ของคำถามเดิม

- หลักฐาน: [`roundRequest.ts:30`](../../frontend/src/features/recruitment/utils/roundRequest.ts#L30) กำหนด `2000` และ [บรรทัด 50–55](../../frontend/src/features/recruitment/utils/roundRequest.ts#L50) ส่งค่านี้ทุกคำถาม; [บรรทัด 82–98](../../frontend/src/features/recruitment/utils/roundRequest.ts#L82) แปลงคำถามกลับเข้าฟอร์มโดยไม่เก็บ `maxLength`; [`RoundEditRoutePage.tsx:42`](../../frontend/src/pages/RoundEditRoutePage.tsx#L42) ใช้ mapper เดียวกันกับ PUT; [OpenAPI](../api/rounds.openapi.yaml#L1011) รับ maxLength รายคำถาม
- ผล: หาก draft มีคำถามที่ maxLength ไม่ใช่ 2000 ทดลอง mapper ด้วยข้อมูลจำลอง: โหลดค่า 500 แล้ว payload ส่ง 2000 จริง ส่วนผลบันทึกลง API/database และเงื่อนไขการแก้ draft ยังไม่ได้ทดสอบ
- แผน: เก็บค่าเดิมตาม question ID เมื่อ edit และใช้ 2000 เฉพาะคำถามใหม่ตาม default ที่ยืนยัน; regression test โหลดค่าที่ต่างกัน → แก้ชื่อรอบ → ตรวจ payload และข้อมูลหลังบันทึก รวมเพิ่ม/ลบ/จัดลำดับ

### P1 — เขตเวลาที่ฟอร์มใช้ขึ้นกับเครื่องผู้ใช้

- หลักฐาน: [`roundRequest.ts:33`](../../frontend/src/features/recruitment/utils/roundRequest.ts#L33) แปลง local input ด้วย `new Date(...)`; [บรรทัด 60–90](../../frontend/src/features/recruitment/utils/roundRequest.ts#L60) อ่านกลับด้วย local getters; [`format.ts:1`](../../frontend/src/lib/format.ts#L1) แสดงผลโดยบังคับ `Asia/Bangkok`; [`recruitmentValidation.ts:33`](../../frontend/src/features/recruitment/utils/recruitmentValidation.ts#L33) ก็ใช้เวลา local
- ผล: เครื่องที่ตั้งเขตเวลาต่างจากกรุงเทพอาจบันทึก instant และเห็นเวลาไม่ตรงที่คาด ส่วนเวลา deadline ถูกประกอบเป็น `23:59:59` ซึ่งต้องตรวจว่าตรงกติกา deadline แบบ exclusive หรือไม่ ทดลอง mapper ด้วยเวลา 09:00 เดียวกัน: เมื่อ `TZ=UTC` ได้ `09:00Z` และเมื่อ `TZ=Asia/Bangkok` ได้ `02:00Z`; ยังไม่ได้ทดสอบใน browser หรือยืนยันว่าขัดกับ requirement เขตเวลา
- แผน: PO/BE ยืนยันว่า input หมายถึง Bangkok หรือเขตเครื่องและความละเอียด deadline; ใช้กติกาเดียวกับการแสดงผล/validation/serialization และทดสอบอย่างน้อย `TZ=Asia/Bangkok` กับ `TZ=UTC` รวมขอบ deadline และ edit ไม่เปลี่ยนค่า

### P2 — ค้นหาชมรมกรองซ้ำหลัง server pagination

- หลักฐาน: [`ClubSearchPage.tsx:145`](../../frontend/src/pages/ClubSearchPage.tsx#L145) แปลงชื่อหมวดเป็น ID แล้ว [บรรทัด 147–153](../../frontend/src/pages/ClubSearchPage.tsx#L147) กรองรายการที่ API คืนซ้ำตามชื่อ/description/สถานะ; [`publicClubSearchService.ts:14`](../../frontend/src/features/clubs/services/publicClubSearchService.ts#L14) ส่ง filter ไป API แล้ว; [`clubSearchPage.test.ts:136`](../../frontend/tests/clubSearchPage.test.ts#L136) ใช้ prop `clubs` จำลองข้อมูล
- ผล: semantics ของ client กับ backend อาจไม่ตรงกัน ทำให้ผลหรือจำนวนต่อหน้าไม่สัมพันธ์กับ pagination; ชื่อหมวดซ้ำอาจแปลงเป็น ID ผิด ขึ้นกับข้อมูลและ contract ต้องเพิ่ม test ยืนยัน
- แผน: production ใช้ผล server เป็นหลักและเก็บ category ID ใน select; เปลี่ยน test ให้ mock API แล้วประเมินลบ prop และ filter ที่ใช้เฉพาะ fixture ตรวจ query, tag/คำค้นที่ server รองรับ, duplicate name, pagination และ response ที่มาช้า

### P2 — ปีการศึกษาและคำถามตั้งต้นถูกกำหนดในฟอร์ม

- หลักฐาน: [`RecruitmentRoundForm.tsx:28`](../../frontend/src/features/recruitment/components/RecruitmentRoundForm.tsx#L28) มีปีปัจจุบัน ±1 และ [บรรทัด 41–44](../../frontend/src/features/recruitment/components/RecruitmentRoundForm.tsx#L41) ใส่คำถามบังคับ 2 ข้อให้อัตโนมัติ; [บรรทัด 70–74](../../frontend/src/features/recruitment/components/RecruitmentRoundForm.tsx#L70) มีข้อยกเว้นให้ค่าเดิมตอน edit; [contract](../api/rounds.openapi.yaml#L1029) ระบุช่วงปีที่กว้างกว่า
- ผล: การสร้างรอบเลือกปีนอกช่วงไม่ได้ และผู้สร้างอาจบันทึกคำถาม template โดยไม่ตั้งใจ ทั้งนี้อาจเป็น UX ที่ตั้งใจไว้ ต้องตรวจ requirement กับ PO
- แผน: ยืนยันช่วงปี/ความจำเป็นของคำถาม default; หากไม่ใช่กฎ ให้กรอกปีที่ valid ได้ และเริ่มคำถามว่างหรือระบุเป็น template ที่เลือกได้ ทดสอบสร้าง/edit ปีนอกช่วงและ payload ก่อนบันทึก

### P2 — สถานะรอบเป็น snapshot ณ เวลาโหลด

- หลักฐาน: [`useApiResource.ts:22`](../../frontend/src/hooks/useApiResource.ts#L22) เก็บ `loadedAt`; [`RoundListPage.tsx:140`](../../frontend/src/features/recruitment/components/RoundListPage.tsx#L140) และ [`ClubManageRoutePage.tsx:64`](../../frontend/src/pages/ClubManageRoutePage.tsx#L64) คำนวณสถานะจากเวลานั้น
- ผล: เปิดหน้าค้างข้ามเวลาเปิด/ปิดแล้ว badge หรือปุ่มอาจค้างจนโหลดใหม่ ไม่ได้พิสูจน์ว่า backend ยอมรับ action ผิด เพราะต้องตรวจสิทธิ์และเวลาด้วยฝั่ง server
- แผน: ตกลงว่าหน้าต้องอัปเดตอัตโนมัติหรือแค่ระบุเวลา snapshot/ปุ่ม refresh; หากต้องสดให้ตั้ง timer เฉพาะ transition ใกล้สุดและ cleanup ทดสอบข้ามขอบเวลา หลีกเลี่ยง polling หากไม่จำเป็น

### P2 — ข้อความ/สีกราฟผูกกับจำนวนและลำดับข้อมูล

- หลักฐาน: [`DataCharts.tsx:11`](../../frontend/src/features/admin-dashboard/components/DataCharts.tsx#L11) มีสี 4 สีวนซ้ำ; [บรรทัด 74–77](../../frontend/src/features/admin-dashboard/components/DataCharts.tsx#L74) ยกหมวดแรกเสมอ; [บรรทัด 83–86](../../frontend/src/features/admin-dashboard/components/DataCharts.tsx#L83) ระบุ 5 อันดับและรอบปัจจุบัน
- ผล: หากหมวดมากกว่า 4 สีซ้ำ และหมวดแรกอาจไม่ใช่อันดับสูงสุด ข้อความอาจไม่ตรง filter หรือจำนวนจริง ต้องตรวจความหมายของ Task71/OpenAPI และข้อมูลจริงก่อนตัดสิน
- แผน: ตัดกล่องเน้นหมวดแรกหากไม่มีประโยชน์ที่ยืนยัน ปรับคำอธิบายให้ตรงขอบเขตข้อมูล และให้ legend อ่านแยกได้โดยไม่พึ่งสี ทดสอบศูนย์รายการ มากกว่า 4 หมวด และลำดับที่ API คืน

### P2 — Dev account probe ทำงานทุก Vite mode ใน working tree

- หลักฐาน: [`AuthContext.tsx:50`](../../frontend/src/features/auth/AuthContext.tsx#L50) ใช้ `import.meta.env?.MODE !== undefined`; [บรรทัด 97–115](../../frontend/src/features/auth/AuthContext.tsx#L97) ขอ dev accounts; [`App.tsx:10`](../../frontend/src/App.tsx#L10) render switcher
- ผล: production Vite build มี MODE เช่นกัน จึงอาจยิง request เพิ่มแม้ปลายทางไม่เปิดใช้งาน; สวิตช์จะแสดงเมื่อ API คืนบัญชีเท่านั้น ยังไม่ได้ทดสอบ production build หรือสรุปว่าข้าม security ได้
- แผน: ยืนยันว่า deployment แบบใดต้องใช้ mock switcher แล้วกำหนด opt-in build flag หรือ `import.meta.env.DEV` ตามความต้องการ โดย backend ต้องปิดและตรวจสิทธิ์อิสระเสมอ ทดสอบ dev mock / dev real / production และไม่ให้ request กระทบ session

### P3 — โค้ดเหลือจาก template หรือไม่มี caller ใน repository

- หลักฐาน: `rg` ใน `frontend/src`, tests และ HTML ไม่พบการอ้าง [`App.css`](../../frontend/src/App.css), `assets/react.svg`, `assets/vite.svg`, `assets/hero.png`, `public/icons.svg`; [`clubApi.ts:5`](../../frontend/src/features/clubs/api/clubApi.ts#L5) export `getCsrfToken` แต่ไม่พบ caller; [`validation.ts:36`](../../frontend/src/utils/validation.ts#L36) และ [บรรทัด 44](../../frontend/src/utils/validation.ts#L44) มี validator ที่ไม่พบ caller ใน frontend
- แผน `delete`: ตรวจ reference ใน repo ทั้งหมดและการใช้งาน asset URL ภายนอกก่อนลบ; ลบ `hasAllowedEmailDomain` เฉพาะถ้าไม่มี caller หลังลบ validator ห้ามลบ `getCsrfHeaders` หรือ security checks ที่ยังใช้จริง จากนั้น build และ tests

### P3 — การโหลดข้อมูลลักษณะเดียวกันมีหลายรูปแบบ

- หลักฐาน: [`useClubProfile.ts:14`](../../frontend/src/features/clubs/hooks/useClubProfile.ts#L14) มี data/loading/error, reset ระหว่าง render และ reload counter; [`useApiResource.ts:14`](../../frontend/src/hooks/useApiResource.ts#L14) เป็น hook ที่ใช้หลายหน้า; [`OpenCallBoard.tsx:57`](../../frontend/src/features/openCalls/components/OpenCallBoard.tsx#L57) มี key/retry/ignore แยก
- แผน `shrink`: ทดลองใช้ hook ที่มีอยู่กับ **หนึ่งหน้า** เฉพาะเมื่อโค้ดสั้นลงและยังรักษา loading, retry, stale-response guard, error และ timestamp เดิม อย่าสร้าง framework หรือย้ายทุกหน้าพร้อมกัน ทดสอบสลับ ID และ response เก่ามาทีหลัง

### P3 — แสดง modal แล้ว reset state ใน effect

- หลักฐาน: [`PublishResultsModal.tsx:29`](../../frontend/src/features/applications/components/PublishResultsModal.tsx#L29) มี effect reset state เมื่อเปิด/เปลี่ยน round; `npm run lint` รายงาน `react(set-state-in-effect)` ที่บรรทัด 35
- แผน `shrink`: ประเมิน mount modal เฉพาะตอนเปิด และใช้ key ที่เหมาะสมแทน effect หากยังรักษา behavior ระหว่าง submit/เปลี่ยน round ได้ ทดสอบปิด–เปิดใหม่, เปลี่ยน round และปุ่มป้องกันส่งซ้ำ

### P3 — การคำนวณและ helper ซ้ำขนาดเล็ก

- หลักฐาน: [`DataCharts.tsx:31`](../../frontend/src/features/admin-dashboard/components/DataCharts.tsx#L31) ใช้ `slice`/`reduce` สำหรับทุกหมวด (งานรวม O(n²)); page parser รูปแบบเดียวกันอยู่ใน [`OpenCallBoard.tsx:20`](../../frontend/src/features/openCalls/components/OpenCallBoard.tsx#L20) และ [`MyApplicationsPage.tsx:35`](../../frontend/src/features/applications/pages/MyApplicationsPage.tsx#L35)
- แผน `shrink`: หากแตะกราฟอยู่แล้วคำนวณ offset ในรอบเดียว; ดึง parser มาใช้ร่วมกันเฉพาะหากลดโค้ดจริงและรักษา URL เดิม ไม่ถือว่าเป็นปัญหา performance ที่วัดแล้ว และไม่ต้องเพิ่ม dependency

## ค่าที่ไม่ควรลบเพียงเพราะเป็น hard-code

- page size เช่น 12/20 เป็นการตัดสินใจ UX และจำกัดการโหลด; [`ClubManageRoutePage.tsx:18`](../../frontend/src/pages/ClubManageRoutePage.tsx#L18) จำกัด 100 พร้อมแจ้งเมื่อมีข้อมูลมากกว่า ไม่ใช่ยอดรวมทั้งหมด
- semester mapping, status และ API paths เป็นส่วนของ contract; สี ข้อความและ layout เป็น presentation; `localhost:8080` ใน [`vite.config.ts`](../../frontend/vite.config.ts#L9) เป็น dev proxy ค่อยทำ configurable เมื่อมี environment ที่ต้องใช้จริง
- `Asia/Bangkok` ใน formatter และค่า offset ใน [`closingHint.ts`](../../frontend/src/features/openCalls/utils/closingHint.ts#L1) มีเหตุผลด้านวันปฏิทินและ exclusive deadline ไม่ควรลบโดยไม่ตรวจขอบเวลา
- อย่าตัด CSRF, authorization, validation, stale-response guards, focus management หรือ error handling เพื่อให้จำนวนบรรทัดลดลง และอย่าลบไฟล์เพราะ export อย่างเดียวโดยไม่ดูหน้าที่

## แผนดำเนินงานและการตรวจรับ

1. **ยืนยันพฤติกรรมและ contract (PO + FE/BE):** ตัดสินกรองประวัติทั้งชุด, timezone/deadline, ปีและคำถามตั้งต้น; ตรวจ contract ของ maxLength และกราฟก่อนแก้ เปิดประเด็นที่ต้องใช้ BE แยกให้ชัด
2. **แก้ความถูกต้องก่อน (FE + BE ตาม dependency):** เก็บค่า maxLength ตอน edit, ปรับ filter/count ให้ตรงขอบเขตที่ตกลง, จัดการ time zone จากนั้นทำ regression tests เฉพาะความเสี่ยงแต่ละข้อ
3. **แก้ UX/ข้อมูลตั้งต้น (FE + PO):** ปีการศึกษาและคำถาม, คำอธิบายกราฟ, stale status และ dev probe พร้อมทดสอบ error, pagination และ deployment mode
4. **ลดโค้ดที่มีหลักฐานว่าไม่ใช้ (FE):** ตรวจ references ทั้ง repo แล้วลบ template/dead exports และพิจารณา reuse hook/parser ทีละจุด โดยไม่แก้ behavior ที่ยังมีผู้ใช้
5. **ตรวจคุณภาพและเอกสาร:** รัน `npm run lint`, `npm test`, `npm run build` และ tests ใหม่ที่เกี่ยวข้อง; ทดสอบ browser flows ที่แก้และ accessibility เบื้องต้น; อัปเดต OpenAPI/Story/คู่มือเมื่อ contract หรือการใช้งานเปลี่ยน พร้อมระบุผลและข้อจำกัดใน PR

ผลกระทบต่อจำนวนบรรทัด/จำนวน dependency ยังประเมินเชิงตัวเลขอย่างน่าเชื่อถือไม่ได้ก่อนตรวจ external asset references และเลือกวิธีแก้; ไม่มีข้อเสนอเพิ่ม dependency และยังไม่พบ dependency ที่ยืนยันได้ว่าลบได้อย่างปลอดภัย

## ผลตรวจระหว่าง audit

- `npm run lint`: exit 0 แต่มี warning `react(set-state-in-effect)` 1 รายการใน `PublishResultsModal.tsx`.
- `npm test`: รันไม่ได้ใน sandbox เพราะ `tsx` เปิด IPC socket แล้วได้ `EPERM`; ใช้ `node --import tsx --test tests/*.test.ts` แทน ผ่าน 28 test files, 0 ล้มเหลว (ตัว runner สรุปเป็นจำนวนไฟล์ ไม่ใช่จำนวน test case ภายใน)
- `npm run build`: ผ่าน; Vite แจ้ง warning bundle หลัก 506.75 kB ก่อน gzip ซึ่งยังไม่ใช่หลักฐานว่าต้องทำ code splitting จนกว่าจะวัดผลกระทบจริง
- ทดสอบ mapper แยกใน Node ด้วยข้อมูลจำลอง: `maxLength` 500 → 2000 และ input เวลาเดียวกันให้ UTC instant ต่างกันตาม timezone; ไม่ได้เรียก API หรือเขียนฐานข้อมูล
- ไม่ได้รัน browser E2E; ไม่ได้แก้ source, migrations หรือทดสอบ production backend ในรอบนี้
