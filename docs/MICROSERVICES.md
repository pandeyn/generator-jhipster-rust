# Microservices Architecture Guide

This guide explains how to deploy JHipster Rust applications as microservices in a distributed architecture.

## Overview

When generating a microservice application, the Rust backend serves as a standalone API service:

- **API-only**: No static file serving, UI is handled by a gateway
- **Stateless**: JWT tokens enable horizontal scaling
- **Independent**: Each microservice has its own database
- **Discoverable**: Health endpoints for container orchestration

## Architecture Diagram

```
                        ┌─────────────────────┐
                        │       Gateway       │
                        │  (Angular/React/Vue │
                        │     + Routing)      │
                        └──────────┬──────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Microservice 1  │      │ Microservice 2  │      │ Microservice N  │
│     (Rust)      │      │     (Rust)      │      │  (Spring/Rust)  │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    Database 1   │      │    Database 2   │      │    Database N   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Key Differences from Monolithic Apps

| Feature        | Monolith                  | Microservice              |
| -------------- | ------------------------- | ------------------------- |
| UI Serving     | Rust backend serves SPA   | Gateway serves UI         |
| Static Files   | `SERVE_STATIC_FILES=true` | Not applicable            |
| Port           | 8080 (UI + API)           | Unique port per service   |
| Authentication | Direct JWT/OAuth2         | Token passed from gateway |
| Deployment     | Single container          | Multiple containers       |

## Configuration

### Environment Variables

```env
# Application
APP_NAME=myService
APP_ENV=development
APP_PORT=8081  # Use unique port for each microservice
APP_HOST=0.0.0.0

# Database (example for PostgreSQL)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/myservice

# JWT Configuration
# Use the same secret across all microservices for token validation
JWT_SECRET=shared-jwt-secret-across-microservices
JWT_EXPIRATION_HOURS=24

# Logging
RUST_LOG=info,my_service=debug,tower_http=debug
```

### Port Allocation

Assign unique ports to each microservice to avoid conflicts:

| Service   | Default Port |
| --------- | ------------ |
| Gateway   | 8080         |
| Service 1 | 8081         |
| Service 2 | 8082         |
| Service 3 | 8083         |

## Authentication in Microservices

### JWT Authentication

With JWT authentication, tokens are issued by one service (or an auth server) and validated by all microservices:

1. **Token Issuance**: Gateway or auth service issues JWT tokens
2. **Token Propagation**: Gateway forwards tokens to microservices
3. **Token Validation**: Each microservice validates tokens using shared secret

```
┌────────┐     ┌─────────┐     ┌──────────────┐
│ Client │────▶│ Gateway │────▶│ Microservice │
└────────┘     └─────────┘     └──────────────┘
                   │                   │
              Issue JWT          Validate JWT
              (login)           (same secret)
```

**Important**: All microservices must use the same `JWT_SECRET` for token validation.

### OAuth2/OIDC Authentication

With OAuth2/OIDC (Keycloak), the identity provider handles authentication centrally:

1. **Authentication**: Gateway redirects users to Keycloak
2. **Token Exchange**: Gateway receives and stores tokens
3. **Token Propagation**: Gateway forwards access tokens to microservices
4. **Token Validation**: Microservices validate tokens against Keycloak's JWKS endpoint

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────────┐
│ Client │────▶│ Gateway │────▶│ Keycloak │     │ Microservice │
└────────┘     └─────────┘     └──────────┘     └──────────────┘
                   │                                    │
              OAuth2 flow                        Validate JWT
                                               (JWKS endpoint)
```

## API Endpoints

The microservice exposes REST API endpoints without UI-related routes:

### Core Endpoints

| Endpoint             | Method | Description        |
| -------------------- | ------ | ------------------ |
| `/api/authenticate`  | POST   | Login (JWT only)   |
| `/api/account`       | GET    | Get current user   |
| `/api/users`         | GET    | List users (admin) |
| `/api/admin/users`   | CRUD   | User management    |
| `/management/health` | GET    | Health check       |
| `/management/info`   | GET    | Application info   |

### Entity Endpoints

For each generated entity (e.g., `Product`):

| Endpoint            | Method | Description          |
| ------------------- | ------ | -------------------- |
| `/api/products`     | GET    | List with pagination |
| `/api/products/:id` | GET    | Get by ID            |
| `/api/products`     | POST   | Create new           |
| `/api/products/:id` | PUT    | Update               |
| `/api/products/:id` | DELETE | Delete               |

## Docker Deployment

### Dockerfile

The generated Dockerfile is optimized for microservice deployment:

```dockerfile
# Multi-stage build for minimal image size
FROM rust:1.75-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/my_service /usr/local/bin/
EXPOSE 8081
CMD ["my_service"]
```

### Docker Compose

Example `docker-compose.yml` for multi-service deployment:

```yaml
version: '3.8'
services:
  gateway:
    image: gateway:latest
    ports:
      - '8080:8080'
    environment:
      - SERVICE1_URL=http://service1:8081
      - SERVICE2_URL=http://service2:8082
    depends_on:
      - service1
      - service2

  service1:
    build: ./service1
    ports:
      - '8081:8081'
    environment:
      - APP_PORT=8081
      - JWT_SECRET=shared-secret
      - DATABASE_URL=postgres://postgres:postgres@postgres1:5432/service1
    depends_on:
      - postgres1

  service2:
    build: ./service2
    ports:
      - '8082:8082'
    environment:
      - APP_PORT=8082
      - JWT_SECRET=shared-secret
      - DATABASE_URL=postgres://postgres:postgres@postgres2:5432/service2
    depends_on:
      - postgres2

  postgres1:
    image: postgres:16
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=service1
    volumes:
      - postgres1_data:/var/lib/postgresql/data

  postgres2:
    image: postgres:16
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=service2
    volumes:
      - postgres2_data:/var/lib/postgresql/data

volumes:
  postgres1_data:
  postgres2_data:
```

## Health Checks

The microservice provides health endpoints for container orchestration:

### Liveness Probe

```bash
curl http://localhost:8081/management/health/liveness
```

Response:

```json
{
  "status": "UP"
}
```

### Readiness Probe

```bash
curl http://localhost:8081/management/health/readiness
```

Response:

```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP" }
  }
}
```

### Kubernetes Health Configuration

```yaml
livenessProbe:
  httpGet:
    path: /management/health/liveness
    port: 8081
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /management/health/readiness
    port: 8081
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Inter-Service Communication

### HTTP Client Calls

For calling other microservices, use `reqwest`:

```rust
use reqwest::Client;

async fn call_other_service(client: &Client, token: &str) -> Result<SomeData, Error> {
    let response = client
        .get("http://other-service:8082/api/data")
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await?
        .json::<SomeData>()
        .await?;

    Ok(response)
}
```

### Token Propagation

When making inter-service calls, propagate the authentication token:

```rust
// Extract token from incoming request
let token = req.headers()
    .get("Authorization")
    .and_then(|v| v.to_str().ok())
    .unwrap_or("");

// Forward token to downstream service
let response = client
    .get("http://other-service/api/data")
    .header("Authorization", token)
    .send()
    .await?;
```

## Scaling Considerations

### Stateless Design

The microservice is designed to be stateless:

- No session state stored in memory
- JWT tokens are self-contained
- Database connections are pooled

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```yaml
# docker-compose.yml
services:
  myservice:
    deploy:
      replicas: 3
```

### Database Connection Pooling

Configure connection pool size based on instances:

```rust
// In db/connection.rs
let pool = r2d2::Pool::builder()
    .max_size(10)  // Connections per instance
    .build(manager)?;
```

## Monitoring

### Logging

Logs are structured for log aggregation:

```bash
RUST_LOG=info,my_service=debug,tower_http=trace
```

### Metrics (Future)

Prometheus metrics endpoint (planned):

- `/metrics` - Prometheus-compatible metrics

## Troubleshooting

### Connection Refused

If microservices can't communicate:

1. Check service names in Docker network
2. Verify port mappings
3. Ensure services are on the same Docker network

### Token Validation Failures

If JWT validation fails between services:

1. Verify `JWT_SECRET` is identical across services
2. Check token expiration
3. Ensure clocks are synchronized (NTP)

### Database Connection Issues

1. Verify database container is running and healthy
2. Check connection string format
3. Ensure database user has proper permissions

## See Also

- [Docker Guide](./DOCKER.md) - Container deployment
- [Security Guide](./SECURITY.md) - Authentication details
- [Keycloak Guide](./KEYCLOAK.md) - OAuth2/OIDC setup
- [Testing Guide](./TESTING.md) - Integration testing
