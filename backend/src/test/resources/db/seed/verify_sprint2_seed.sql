-- Read-only verification for TU ClubHub Sprint 2 fixture data.
-- Run against your disposable local PostgreSQL test database.

SELECT u.tu_username, c.name AS club, r.title AS round_title,
       a.status, a.decided_at, a.responded_at
FROM applications a
JOIN users u ON u.id = a.applicant_id
JOIN recruitment_rounds r ON r.id = a.round_id
JOIN clubs c ON c.id = a.club_id
WHERE u.tu_username IN (
    'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
    'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
ORDER BY u.tu_username;

SELECT a.status, count(*) AS count
FROM applications a
JOIN users u ON u.id = a.applicant_id
WHERE u.tu_username IN (
    'seed_s2_submitted', 'seed_s2_review', 'seed_s2_accepted',
    'seed_s2_rejected', 'seed_s2_confirmed', 'seed_s2_declined'
)
GROUP BY a.status ORDER BY a.status;

SELECT u.tu_username, count(m.id) AS memberships
FROM users u
LEFT JOIN club_memberships m ON m.user_id = u.id
WHERE u.tu_username IN ('seed_s2_confirmed', 'seed_s2_declined')
GROUP BY u.tu_username ORDER BY u.tu_username;

DO $$
DECLARE
    bad_count INTEGER;
BEGIN
    SELECT count(*) INTO bad_count FROM (VALUES
        ('seed_s2_submitted', 'SUBMITTED'),
        ('seed_s2_review', 'UNDER_REVIEW'),
        ('seed_s2_accepted', 'ACCEPTED'),
        ('seed_s2_rejected', 'REJECTED'),
        ('seed_s2_confirmed', 'CONFIRMED'),
        ('seed_s2_declined', 'DECLINED')
    ) AS expected(username, status)
    WHERE NOT EXISTS (
        SELECT 1 FROM users u
        JOIN applications a ON a.applicant_id = u.id
        WHERE u.tu_username = expected.username AND a.status = expected.status
    );
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'Missing/wrong statuses for % Sprint 2 fixtures', bad_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM users u
        JOIN applications a ON a.applicant_id = u.id
        JOIN club_memberships m
          ON m.source_application_id = a.id
         AND m.club_id = a.club_id
         AND m.user_id = a.applicant_id
        WHERE u.tu_username = 'seed_s2_confirmed'
          AND a.status = 'CONFIRMED' AND m.status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'CONFIRMED application is missing ACTIVE membership';
    END IF;

    IF EXISTS (
        SELECT 1 FROM users u
        JOIN club_memberships m ON m.user_id = u.id
        WHERE u.tu_username = 'seed_s2_declined'
    ) THEN
        RAISE EXCEPTION 'DECLINED applicant unexpectedly has club membership';
    END IF;

    RAISE NOTICE 'Sprint 2 seed verification PASSED';
END $$;
