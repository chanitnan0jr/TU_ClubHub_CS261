# ==============================================================================
# TU-ClubHub Database Container Image (PostgreSQL 17 Alpine)
# Part of the 2-container architecture:
#   1. backend-frontend (Spring Boot API + embedded React SPA)
#   2. database         (PostgreSQL 17 relational database)
# ==============================================================================
FROM postgres:17-alpine

LABEL org.opencontainers.image.title="tu-clubhub-database" \
      org.opencontainers.image.description="TU-ClubHub PostgreSQL 17 Database Container"

EXPOSE 5432

HEALTHCHECK --interval=5s --timeout=5s --retries=5 --start-period=10s \
  CMD pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-tu_clubhub}" || exit 1
