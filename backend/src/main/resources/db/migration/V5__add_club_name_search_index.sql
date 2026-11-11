
-- Improve substring searches for public club names.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_clubs_name_trgm
ON clubs USING GIN (name gin_trgm_ops);
