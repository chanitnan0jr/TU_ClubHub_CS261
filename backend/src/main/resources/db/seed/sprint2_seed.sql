-- TU ClubHub / Sprint 2 - additional DEV/TEST fixture data (PostgreSQL 17)
-- Prerequisites: Flyway V1/V3 schema and the existing V2__seed_test_data.sql.
-- Run this file manually against a LOCAL TEST database, never production.
-- All accounts are fictional. The schema has NO password/password_hash column.
-- Designed to be idempotent; existing application decisions are not overwritten.
-- Status fixtures: SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED,
--                  CONFIRMED, DECLINED.

BEGIN;

-- Ensure the baseline seed has been applied before creating dependent rows.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM clubs WHERE name = 'ชมรมเขียนโปรแกรม'
    ) OR NOT EXISTS (
        SELECT 1 FROM users WHERE tu_username = 'seed_president_tech'
    ) OR NOT EXISTS (
        SELECT 1 FROM recruitment_rounds
        WHERE title = 'DEMO: ชมรมเขียนโปรแกรม รับสมาชิกใหม่'
    ) THEN
        RAISE EXCEPTION 'Missing base seed. Run src/test/resources/db/migration/V2__seed_test_data.sql first.';
    END IF;
END $$;

-- 1) Six fictional applicants (not members of the club at the outset).
INSERT INTO users (tu_username, display_name, email, system_role)
VALUES
    ('seed_s2_submitted', 'Sprint 2 ผู้สมัครรอตรวจ (จำลอง)', 's2-submitted@example.com', 'USER'),
    ('seed_s2_review', 'Sprint 2 ผู้สมัครกำลังตรวจ (จำลอง)', 's2-review@example.com', 'USER'),
    ('seed_s2_accepted', 'Sprint 2 ผู้สมัครผ่าน (จำลอง)', 's2-accepted@example.com', 'USER'),
    ('seed_s2_rejected', 'Sprint 2 ผู้สมัครไม่ผ่าน (จำลอง)', 's2-rejected@example.com', 'USER'),
    ('seed_s2_confirmed', 'Sprint 2 ผู้สมัครยืนยันสิทธิ์ (จำลอง)', 's2-confirmed@example.com', 'USER'),
    ('seed_s2_declined', 'Sprint 2 ผู้สมัครสละสิทธิ์ (จำลอง)', 's2-declined@example.com', 'USER')
ON CONFLICT (tu_username) DO NOTHING;

INSERT INTO student_profiles
    (user_id, student_code, faculty_name, study_year, student_status)
SELECT u.id, src.student_code, 'คณะตัวอย่าง', 2, 'ACTIVE'
FROM (VALUES
    ('seed_s2_submitted', 'SEED-S2-001'),
    ('seed_s2_review', 'SEED-S2-002'),
    ('seed_s2_accepted', 'SEED-S2-003'),
    ('seed_s2_rejected', 'SEED-S2-004'),
    ('seed_s2_confirmed', 'SEED-S2-005'),
    ('seed_s2_declined', 'SEED-S2-006')
) AS src(tu_username, student_code)
JOIN users AS u ON u.tu_username = src.tu_username
WHERE TRUE
ON CONFLICT (user_id) DO NOTHING;

-- 2) Separate completed round: decisions/results can be tested without
-- disrupting the existing open recruitment round from the base V2 seed.
INSERT INTO recruitment_rounds
    (club_id, title, academic_year, semester, description, opens_at, closes_at,
     confirmation_deadline, publication_status, published_at,
     results_published_at, created_by)
SELECT c.id, 'DEMO: Sprint 2 รอบประกาศผล', 2569, 1,
       'รอบปิดรับสมัครและประกาศผลสำหรับทดสอบ US-09/US-10 เท่านั้น',
       now() - interval '60 days',
       now() - interval '30 days',
       now() + interval '30 days',
       'PUBLISHED',
       now() - interval '60 days',
       now() - interval '25 days',
       admin_user.id
FROM clubs AS c
CROSS JOIN users AS admin_user
WHERE c.name = 'ชมรมเขียนโปรแกรม'
  AND admin_user.tu_username = 'seed_admin'
  AND NOT EXISTS (
      SELECT 1 FROM recruitment_rounds AS r
      WHERE r.club_id = c.id AND r.title = 'DEMO: Sprint 2 รอบประกาศผล'
  );

-- 3) Questions on the completed round.
INSERT INTO application_questions (round_id, prompt, is_required, display_order)
SELECT r.id, q.prompt, q.is_required, q.display_order
FROM recruitment_rounds AS r
CROSS JOIN (VALUES
    (1, 'เหตุใดจึงสนใจเข้าร่วมชมรม?', true),
    (2, 'มีทักษะที่เกี่ยวข้องอะไรบ้าง?', false)
) AS q(display_order, prompt, is_required)
WHERE r.title = 'DEMO: Sprint 2 รอบประกาศผล'
  AND NOT EXISTS (
      SELECT 1 FROM application_questions AS existing
      WHERE existing.round_id = r.id AND existing.display_order = q.display_order
  );

-- 4) Applications. 'SUBMITTED' / 'UNDER_REVIEW' belong to the OPEN round;
-- decision/response scenarios belong to the COMPLETED + PUBLISHED round.
INSERT INTO applications
    (round_id, club_id, applicant_id, motivation, status, submitted_at,
     decided_by, decided_at, result_message, responded_at)
SELECT r.id, r.club_id, applicant.id, src.motivation, src.status,
       CASE WHEN src.is_completed_round
            THEN now() - interval '45 days'
            ELSE now() - interval '18 hours' END,
       CASE WHEN src.status IN ('ACCEPTED','REJECTED','CONFIRMED','DECLINED')
            THEN reviewer.id ELSE NULL END,
       CASE WHEN src.status IN ('ACCEPTED','REJECTED','CONFIRMED','DECLINED')
            THEN now() - interval '27 days' ELSE NULL END,
       CASE
            WHEN src.status IN ('ACCEPTED','CONFIRMED','DECLINED') THEN 'ผ่านการคัดเลือก (ข้อมูลจำลอง)'
            WHEN src.status = 'REJECTED' THEN 'ไม่ผ่านการคัดเลือก (ข้อมูลจำลอง)'
            ELSE NULL END,
       CASE WHEN src.status IN ('CONFIRMED','DECLINED')
            THEN now() - interval '20 days' ELSE NULL END
FROM (VALUES
    ('seed_s2_submitted', 'SUBMITTED', false, 'สนใจเรียนรู้การพัฒนาเว็บ'),
    ('seed_s2_review', 'UNDER_REVIEW', false, 'สนใจทำโครงงานกับชมรม'),
    ('seed_s2_accepted', 'ACCEPTED', true, 'ต้องการเข้าร่วมทีมพัฒนาซอฟต์แวร์'),
    ('seed_s2_rejected', 'REJECTED', true, 'สนใจการเขียนโปรแกรม'),
    ('seed_s2_confirmed', 'CONFIRMED', true, 'ต้องการร่วมกิจกรรมชมรมระยะยาว'),
    ('seed_s2_declined', 'DECLINED', true, 'สนใจโครงการฝึกเขียนโปรแกรม')
) AS src(tu_username, status, is_completed_round, motivation)
JOIN users AS applicant ON applicant.tu_username = src.tu_username
JOIN recruitment_rounds AS r ON r.title = CASE
    WHEN src.is_completed_round THEN 'DEMO: Sprint 2 รอบประกาศผล'
    ELSE 'DEMO: ชมรมเขียนโปรแกรม รับสมาชิกใหม่' END
JOIN clubs AS c ON c.id = r.club_id AND c.name = 'ชมรมเขียนโปรแกรม'
JOIN users AS reviewer ON reviewer.tu_username = 'seed_president_tech'
WHERE TRUE
ON CONFLICT (round_id, applicant_id) DO NOTHING;

-- 5) Answers tied to questions in each application round.
INSERT INTO application_answers (application_id, question_id, round_id, answer_text)
SELECT a.id, q.id, a.round_id,
       CASE WHEN q.display_order = 1
            THEN 'คำตอบจำลอง: อยากเรียนรู้และช่วยงานชมรม'
            ELSE 'คำตอบจำลอง: มีพื้นฐานการเขียนโปรแกรมเบื้องต้น' END
FROM applications AS a
JOIN users AS u ON u.id = a.applicant_id
JOIN application_questions AS q ON q.round_id = a.round_id
WHERE u.tu_username IN (
    'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
    'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
ON CONFLICT (application_id, question_id) DO NOTHING;

-- 6) Committee review decisions, using the EXISTING seeded club president.
INSERT INTO application_reviews
    (application_id, reviewer_id, recommendation, internal_comment)
SELECT a.id, reviewer.id,
       CASE WHEN a.status = 'REJECTED' THEN 'REJECT'
            WHEN a.status = 'UNDER_REVIEW' THEN 'DISCUSS'
            ELSE 'ACCEPT' END,
       'SEED_S2: ตัวอย่างความเห็นกรรมการสำหรับทดสอบ'
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
CROSS JOIN users AS reviewer
WHERE applicant.tu_username IN (
    'seed_s2_review', 'seed_s2_accepted', 'seed_s2_rejected',
    'seed_s2_confirmed', 'seed_s2_declined'
)
  AND reviewer.tu_username = 'seed_president_tech'
ON CONFLICT (application_id, reviewer_id) DO NOTHING;

-- 7) Initial history: NULL -> SUBMITTED.
INSERT INTO application_status_history
    (application_id, from_status, to_status, actor_id, reason, changed_at)
SELECT a.id, NULL, 'SUBMITTED', a.applicant_id,
       'SEED_S2: created', a.submitted_at
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
WHERE applicant.tu_username IN (
    'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
    'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
  AND NOT EXISTS (
      SELECT 1 FROM application_status_history AS h
      WHERE h.application_id = a.id
        AND h.from_status IS NULL AND h.to_status = 'SUBMITTED'
        AND h.reason = 'SEED_S2: created'
  );

-- 8) SUBMITTED -> UNDER_REVIEW (for all but the submitted-only fixture).
INSERT INTO application_status_history
    (application_id, from_status, to_status, actor_id, reason, changed_at)
SELECT a.id, 'SUBMITTED', 'UNDER_REVIEW', reviewer.id,
       'SEED_S2: review started', a.submitted_at + interval '1 hour'
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
CROSS JOIN users AS reviewer
WHERE applicant.tu_username IN (
    'seed_s2_review', 'seed_s2_accepted', 'seed_s2_rejected',
    'seed_s2_confirmed', 'seed_s2_declined'
)
  AND reviewer.tu_username = 'seed_president_tech'
  AND NOT EXISTS (
      SELECT 1 FROM application_status_history AS h
      WHERE h.application_id = a.id
        AND h.from_status = 'SUBMITTED' AND h.to_status = 'UNDER_REVIEW'
        AND h.reason = 'SEED_S2: review started'
  );

-- 9) UNDER_REVIEW -> ACCEPTED / REJECTED.
INSERT INTO application_status_history
    (application_id, from_status, to_status, actor_id, reason, changed_at)
SELECT a.id, 'UNDER_REVIEW',
       CASE WHEN a.status = 'REJECTED' THEN 'REJECTED' ELSE 'ACCEPTED' END,
       reviewer.id, 'SEED_S2: decision', a.decided_at
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
CROSS JOIN users AS reviewer
WHERE applicant.tu_username IN (
    'seed_s2_accepted', 'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
  AND reviewer.tu_username = 'seed_president_tech'
  AND NOT EXISTS (
      SELECT 1 FROM application_status_history AS h
      WHERE h.application_id = a.id
        AND h.from_status = 'UNDER_REVIEW'
        AND h.to_status = CASE WHEN a.status = 'REJECTED' THEN 'REJECTED' ELSE 'ACCEPTED' END
        AND h.reason = 'SEED_S2: decision'
  );

-- 10) ACCEPTED -> CONFIRMED / DECLINED.
INSERT INTO application_status_history
    (application_id, from_status, to_status, actor_id, reason, changed_at)
SELECT a.id, 'ACCEPTED', a.status, a.applicant_id,
       'SEED_S2: applicant response', a.responded_at
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
WHERE applicant.tu_username IN ('seed_s2_confirmed', 'seed_s2_declined')
  AND NOT EXISTS (
      SELECT 1 FROM application_status_history AS h
      WHERE h.application_id = a.id
        AND h.from_status = 'ACCEPTED' AND h.to_status = a.status
        AND h.reason = 'SEED_S2: applicant response'
  );

-- 11) Only CONFIRMED creates membership (for US-10).
INSERT INTO club_memberships
    (club_id, user_id, source_application_id, status, joined_at)
SELECT a.club_id, a.applicant_id, a.id, 'ACTIVE', a.responded_at
FROM applications AS a
JOIN users AS applicant ON applicant.id = a.applicant_id
WHERE applicant.tu_username = 'seed_s2_confirmed'
  AND a.status = 'CONFIRMED'
ON CONFLICT (club_id, user_id) DO NOTHING;

-- 12) Fail atomically if any of the six required sample statuses is missing.
DO $$
DECLARE
    n INTEGER;
BEGIN
    SELECT count(DISTINCT a.status) INTO n
    FROM applications AS a
    JOIN users AS u ON u.id = a.applicant_id
    WHERE u.tu_username IN (
        'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
        'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
    );
    IF n <> 6 THEN
        RAISE EXCEPTION 'Expected 6 Sprint 2 application statuses, found %', n;
    END IF;
END $$;

COMMIT;
