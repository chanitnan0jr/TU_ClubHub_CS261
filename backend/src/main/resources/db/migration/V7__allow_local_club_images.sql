ALTER TABLE clubs
    DROP CONSTRAINT chk_clubs_image_url,
    DROP CONSTRAINT chk_clubs_banner_url,
    ADD CONSTRAINT chk_clubs_image_url CHECK (
        image_url IS NULL OR image_url ~* '^(https://|/images/)[^[:space:]]+$'
    ),
    ADD CONSTRAINT chk_clubs_banner_url CHECK (
        banner_url IS NULL OR banner_url ~* '^(https://|/images/)[^[:space:]]+$'
    );
