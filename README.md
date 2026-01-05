# generator-jhipster-rust

> JHipster blueprint for generating Rust backends with Axum

[![NPM version][npm-image]][npm-url]
[![Generator][github-generator-image]][github-generator-url]
[![Samples][github-samples-image]][github-samples-url]

# Introduction

This is a [JHipster](https://www.jhipster.tech/) blueprint that generates a **Rust backend** using the [Axum](https://github.com/tokio-rs/axum) web framework as an alternative to the traditional Spring Boot backend. It enables you to leverage Rust's performance, safety, and low memory footprint while keeping the familiar JHipster development experience and Angular/React/Vue frontend.

The generated Rust server provides a complete REST API implementation with authentication, user management, entity CRUD operations, and full compatibility with JHipster's frontend clients.

## Implemented Features

| Category                 | Feature                      | Status | Notes                                      |
| ------------------------ | ---------------------------- | ------ | ------------------------------------------ |
| **Backend Framework**    | Axum web framework           | ✅     | Async HTTP server with Tower middleware    |
|                          | Tokio async runtime          | ✅     | High-performance async I/O                 |
|                          | Structured logging (tracing) | ✅     | Request tracing and structured logs        |
| **Databases**            | SQLite                       | ✅     | Default option, no external server needed  |
|                          | PostgreSQL                   | ✅     | Full support with Diesel ORM               |
|                          | MySQL                        | ✅     | Full support with Diesel ORM               |
|                          | MongoDB                      | ✅     | Native driver with ObjectId, embedded docs |
| **Authentication**       | JWT (JSON Web Tokens)        | ✅     | Stateless auth with configurable expiry    |
|                          | OAuth2/OIDC (Keycloak)       | ✅     | Full OIDC flow with JWKS validation        |
|                          | Role-based access control    | ✅     | ROLE_USER, ROLE_ADMIN authorities          |
| **User Management**      | User CRUD operations         | ✅     | Create, read, update, delete users         |
|                          | Password hashing (Argon2)    | ✅     | Secure password storage                    |
|                          | Authority management         | ✅     | Assign/remove user roles                   |
| **Entity Generation**    | Basic CRUD endpoints         | ✅     | GET, POST, PUT, DELETE for entities        |
|                          | Field types & validations    | ✅     | String, Integer, Boolean, Date, Blob, etc. |
|                          | Pagination & sorting         | ✅     | Page-based results with sort params        |
|                          | Relationships                | ✅     | ManyToOne, OneToMany, OneToOne, ManyToMany |
| **API Documentation**    | Swagger UI                   | ✅     | Interactive API explorer at /swagger-ui    |
|                          | Scalar UI                    | ✅     | Modern API docs at /scalar                 |
|                          | OpenAPI 3.0 spec             | ✅     | JSON spec at /api-docs/openapi.json        |
| **Frontend**             | Angular                      | ✅     | Full JHipster Angular client               |
|                          | React                        | ✅     | Full JHipster React client                 |
|                          | Vue                          | ✅     | Full JHipster Vue client                   |
| **Deployment**           | Docker support               | ✅     | Multi-stage Dockerfile                     |
|                          | Docker Compose               | ✅     | Full stack with DB containers              |
|                          | Monolithic mode              | ✅     | Serve SPA from Rust backend                |
| **Testing**              | Rust unit tests              | ✅     | Service and handler tests                  |
|                          | Cypress E2E tests            | ✅     | End-to-end UI testing                      |
| **Email**                | SMTP email service           | ✅     | Lettre + Tera templates                    |
|                          | Account activation           | ✅     | Email verification for registration        |
|                          | Password reset               | ✅     | Forgot password flow with email            |
| **Developer Experience** | Hot reload (cargo-watch)     | ✅     | Auto-rebuild on file changes               |
|                          | Environment config (.env)    | ✅     | Flexible configuration                     |
|                          | Health endpoints             | ✅     | /management/health, /management/info       |

# Prerequisites

As this is a [JHipster](https://www.jhipster.tech/) blueprint, we expect you have JHipster basic knowledge:

- [JHipster](https://www.jhipster.tech/)

# Documentation

## Entity Generation

- [Entity Generation Guide](docs/ENTITY_GENERATION.md) - Field types, validations, pagination, and relationships

## Supported Databases

- [SQLite Integration](docs/SQLITE.md) - Default database setup (no external server required)
- [PostgreSQL Integration](docs/POSTGRES.md) - Setting up PostgreSQL database with macOS configuration
- [MySQL Integration](docs/MYSQL.md) - Setting up MySQL database with macOS configuration
- [MongoDB Integration](docs/MONGODB.md) - NoSQL document database with ObjectId, embedded documents, and replica set support

## Security & Authentication

- [Security Guide](docs/SECURITY.md) - JWT and OAuth2/OIDC authentication options
- [Keycloak Integration](docs/KEYCLOAK.md) - Detailed Keycloak setup and configuration

## Email Integration

- [Email Integration Guide](docs/EMAIL_INTEGRATION.md) - SMTP configuration, email templates, and local development with MailHog

## API Documentation

- [OpenAPI/Swagger Guide](docs/OPENAPI.md) - Swagger UI, Scalar UI, and OpenAPI 3.0 specification

## Testing

- [Testing Guide](docs/TESTING.md) - Unit tests, integration tests, and Cypress E2E testing

## Deployment

- [Docker Guide](docs/DOCKER.md) - Container setup, Docker Compose, and deployment options
- [Static UI Hosting](docs/STATIC_HOSTING.md) - Serve SPA from Rust backend in monolithic mode
- [Monolithic Deployment](#monolithic-deployment) - Quick start guide for monolithic deployment

# Installation

To install or update this blueprint:

```bash
npm install -g generator-jhipster-rust
```

# Usage

To use this blueprint, run the below command

````bash
jhipster-rust

You can look for updated rust blueprint specific options by running

```bash
jhipster-rust app --help
````

And looking for `(blueprint option: rust)` like

##### Plugin Development USAGE

To begin to work:

- launch: npm install
- link: npm link
- link JHipster: npm link generator-jhipster
- test your module in a JHipster project:
  - create a new directory and go into it
  - link the blueprint: npm link generator-jhipster-undefined
  - launch JHipster with flags: jhipster --blueprints undefined
- then, come back here, and begin to code!

## Pre-release

To use an unreleased version, install it using git.

```bash
npm install -g jhipster/generator-jhipster-rust#main
jhipster --blueprints rust --skip-jhipster-dependencies
```

## Monolithic Deployment

For monolithic applications, you can serve the SPA UI directly from the Rust backend. This enables single-server deployment where the Rust backend serves both API endpoints and the SPA frontend.

### Building the SPA Client

1. Build the SPA client for production:

   ```bash
   cd client
   npm run build
   ```

2. Copy the built files to a location the server can access:
   ```bash
   mkdir -p dist/static
   cp -r client/dist/<baseName>/browser/* dist/static/
   ```

### Configuration

Enable static file serving by setting these environment variables in your `.env` file:

| Variable             | Description                                               | Default         |
| -------------------- | --------------------------------------------------------- | --------------- |
| `SERVE_STATIC_FILES` | Set to `true` to enable static file serving               | `false`         |
| `STATIC_FILES_DIR`   | Path to the directory containing the built Angular app    | `./dist/static` |
| `APP_HTTPS`          | Set to `true` when using HTTPS (for OAuth2 redirect URLs) | `false`         |

Example `.env` configuration:

```env
SERVE_STATIC_FILES=true
STATIC_FILES_DIR=./dist/static
# APP_HTTPS=true  # Uncomment for production with TLS
```

### Running the Server

```bash
cd server
cargo run
```

The server will:

- Serve API endpoints at `/api/*`
- Serve static files from the configured directory
- Fall back to `index.html` for Angular routes (SPA routing)

Access the application at `http://localhost:8080` (or your configured `APP_PORT`).

### OAuth2/Keycloak Considerations

When using OAuth2 authentication with `SERVE_STATIC_FILES=true`:

- The server automatically redirects to itself after authentication (instead of a separate frontend URL)
- Set `APP_HTTPS=true` in production when behind a TLS-terminating proxy
- Ensure your Keycloak client has the correct redirect URI configured (e.g., `http://localhost:8080/*`)

## Not Yet Implemented

The following features are planned for future versions:

| Feature         | Notes                                        |
| --------------- | -------------------------------------------- |
| Caching (Redis) | No Redis dependencies or caching layer       |
| Rate limiting   | No throttle/rate limit middleware (governor) |
| API versioning  | Routes don't use /v1, /v2 prefixes           |
| GraphQL         | No async-graphql support                     |
| WebSocket       | No tokio-tungstenite or ws support           |
| Embedded assets | No rust-embed for single-binary static files |

[npm-image]: https://img.shields.io/npm/v/generator-jhipster-rust.svg
[npm-url]: https://npmjs.org/package/generator-jhipster-rust
[github-generator-image]: https://github.com/jhipster/generator-jhipster-rust/actions/workflows/generator.yml/badge.svg
[github-generator-url]: https://github.com/jhipster/generator-jhipster-rust/actions/workflows/generator.yml
[github-samples-image]: https://github.com/jhipster/generator-jhipster-rust/actions/workflows/samples.yml/badge.svg
[github-samples-url]: https://github.com/jhipster/generator-jhipster-rust/actions/workflows/samples.yml
