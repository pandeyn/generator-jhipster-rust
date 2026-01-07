# Release Notes - v0.7.4

## Overview

JHipster Rust Blueprint v0.7.4 is a comprehensive release that generates production-ready Rust backends using the Axum web framework. This release includes full support for multiple databases, authentication methods, email integration, and API documentation.

## What's New in v0.7.4

### Email Integration

- **SMTP Email Service**: Full email support using Lettre crate with Tera templates
- **Account Activation**: Email verification flow for new user registration
- **Password Reset**: Forgot password functionality with secure reset tokens
- **MailHog Support**: Local development email testing with Docker

### API Documentation

- **Swagger UI**: Interactive API explorer at `/swagger-ui`
- **Scalar UI**: Modern API documentation at `/scalar`
- **OpenAPI 3.0**: JSON specification at `/v3/api-docs`

### Static UI Hosting

- **Monolithic Deployment**: Serve SPA (Angular/React/Vue) directly from Rust backend
- **SPA Routing**: Automatic fallback to `index.html` for client-side routing
- **Cache Headers**: Optimized caching for static assets

### Documentation

- Comprehensive documentation included in generated projects
- Database-specific guides (SQLite, PostgreSQL, MySQL, MongoDB)
- Security and authentication guides
- Testing documentation for unit, integration, and E2E tests

## Features

### Backend Framework

- Axum web framework with async HTTP server
- Tokio async runtime for high-performance I/O
- Tower middleware stack
- Structured logging with tracing

### Database Support

| Database   | ORM/Driver    | Features                              |
| ---------- | ------------- | ------------------------------------- |
| SQLite     | Diesel        | File-based, no external server needed |
| PostgreSQL | Diesel        | Full SQL support with migrations      |
| MySQL      | Diesel        | Full SQL support with migrations      |
| MongoDB    | Native driver | ObjectId, embedded docs, aggregations |

### Authentication

| Method      | Features                                    |
| ----------- | ------------------------------------------- |
| JWT         | Stateless auth, configurable expiry, Argon2 |
| OAuth2/OIDC | Keycloak support, JWKS validation           |

### Entity Generation

- Full CRUD operations (GET, POST, PUT, DELETE)
- Field types: String, Integer, Long, Float, Double, Boolean, Date, Blob, UUID
- Validations: required, min/max length, pattern, min/max values
- Pagination and sorting
- Relationships: ManyToOne, OneToMany, OneToOne, ManyToMany

### Frontend Support

- Angular (full JHipster client)
- React (full JHipster client)
- Vue (full JHipster client)

### Testing

- Rust unit tests for services and handlers
- Integration tests with test database
- Cypress E2E tests for UI testing

### Deployment

- Multi-stage Dockerfile for optimized images
- Docker Compose for full stack deployment
- Monolithic mode for single-server deployment

## Installation

```bash
npm install -g generator-jhipster-rust
```

## Usage

```bash
# Create a new project
mkdir myapp && cd myapp
jhipster-rust

# Generate an entity
jhipster-rust entity Product
```

## Requirements

- Node.js ^18.19.0 or >= 20.6.1
- JHipster 8.11.0
- Rust 1.75.0 or later
- Diesel CLI (for SQL databases)

## Breaking Changes

None in this release.

## Known Issues

- SQLite is not recognized by JHipster core's `getDatabaseData` function; blueprint handles this internally

## Future Roadmap

| Feature         | Status  |
| --------------- | ------- |
| Redis Caching   | Planned |
| Rate Limiting   | Planned |
| API Versioning  | Planned |
| GraphQL         | Planned |
| WebSocket       | Planned |
| Embedded Assets | Planned |

## Contributors

- Neeraj Pandey ([@pandeyn](https://github.com/pandeyn))

## License

Apache-2.0

## Links

- [npm Package](https://npmjs.org/package/generator-jhipster-rust)
- [GitHub Repository](https://github.com/pandeyn/generator-jhipster-rust)
- [JHipster](https://www.jhipster.tech/)
