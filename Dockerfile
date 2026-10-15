# ==============================================================================
# Stage 1: Build Frontend Assets (React + Vite + TypeScript)
# ==============================================================================
FROM node:22.14.0-alpine3.21 AS frontend-builder
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Build Spring Boot JAR with embedded Frontend static assets
# ==============================================================================
FROM eclipse-temurin:21.0.6_7-jdk-alpine AS backend-builder
WORKDIR /workspace/backend

RUN apk add --no-cache dos2unix

COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN dos2unix mvnw && chmod +x mvnw

# Pre-fetch dependencies to leverage Docker layer caching
RUN ./mvnw dependency:go-offline -B

COPY backend/src/ src/

# Embed compiled React frontend assets into Spring Boot's static resources directory
COPY --from=frontend-builder /workspace/frontend/dist/ src/main/resources/static/

# Package executable JAR (unit/integration tests run in CI)
RUN ./mvnw clean package -DskipTests -B

# ==============================================================================
# Stage 3: Minimal Java 21 JRE Runtime Image
# ==============================================================================
FROM eclipse-temurin:21.0.6_7-jre-alpine AS runtime

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy the packaged JAR from backend-builder
COPY --from=backend-builder --chown=appuser:appgroup /workspace/backend/target/*.jar app.jar

USER appuser

EXPOSE 8080
ENV PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
