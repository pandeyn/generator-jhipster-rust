# Release Notes - v0.9.5

## Overview

JHipster Rust Blueprint v0.9.5 makes external configuration via Consul KV an optional feature, separating it cleanly from service discovery. It also adds comprehensive configuration documentation, fixes several template bugs, and updates deployment scripts for correctness.

## What's New in v0.9.5

### Optional External Configuration

External configuration via Consul KV is now a separate, optional feature for gateway and microservice applications. Previously, selecting Consul service discovery automatically enabled external config loading, config watching, and hot-reload. Now these are independent concerns:

- **New CLI prompt**: "Would you like to enable external configuration via Consul KV store?" shown when Consul service discovery is selected
- **Defaults to Yes**: Backward-compatible — existing projects get the same behavior
- **Service discovery without external config**: You can use Consul for service registration and discovery without loading configuration from Consul KV
- **Vault requires external config**: HashiCorp Vault secrets management is only available when external configuration is enabled

### Separation of Concerns

The `serviceDiscoveryConsul` flag previously controlled both service discovery and external configuration. These are now split:

| Flag                     | Controls                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `serviceDiscoveryConsul` | Service registration, discovery, health checks, `consul_config.rs`, `consul_service.rs`                |
| `externalConfig`         | Consul KV config loading, hot-reload, `remote_config.rs`, `config_watcher.rs`, `from_consul_and_env()` |

This separation applies across all generators: rust-server, kubernetes, kubernetes-helm, and docker.

### Configuration Documentation

- **New `docs/CONFIG.md`**: Comprehensive configuration reference generated with every project, covering all environment variables organized by feature, configuration layers, hot-reloadable settings, Consul KV management examples, and a production checklist
- **New `docs/CONFIG.md` in generator project**: Static reference documentation for all configuration options across all feature combinations
- **README template updates**: Added missing technology stack entries (External Configuration, Vault Secrets Management, Circuit Breaker) and linked CONFIG.md as the first entry in the documentation index

### Bug Fixes

- **Dockerfile `skipClient` fix**: The Docker client build stage (`COPY client/`) is now skipped when `skipClient=true`, fixing Docker builds for gateway/monolith apps without a client
- **AppState missing fields**: Fixed `test_utils.rs`, `user.rs`, `account.rs`, and entity handler templates to include `circuit_breaker`, `remote_config`, and `vault_service` fields in test AppState initializers — previously caused `cargo test` compilation failures when these features were enabled
- **`base64` dependency**: Moved `base64` crate back to the `serviceDiscoveryConsul` dependency group since `consul_service.rs` uses it for decoding Consul KV values, fixing `cargo build` failures when external config was disabled
- **Production ribbon fix**: Added `APP_ENV: "development"` to Kubernetes configmaps and Helm values under the `serviceDiscoveryConsul` block, preventing the Angular UI from incorrectly showing the "Production" ribbon in development deployments
- **Consul config loader image**: The `jhipster/consul-config-loader` Docker image is now only loaded when `externalConfig` is true in both `kubectl-apply.sh` and `helm-apply.sh`

### Deployment Script Improvements

- **K8s configmap**: Consul service discovery vars and external config vars are now in separate conditional blocks
- **kubectl-apply.sh**: Consul config loader deployment and cleanup are gated on `externalConfig`
- **Helm values.yaml**: Same separation of service discovery vs external config vars
- **Helm files.js**: `consul-config-configmap.yaml` and `consul-config-job.yaml` are conditional on `externalConfig`

### Generator Project Updates

- **README.md**: Added Gateway mode, External Configuration, and Vault Secrets Management to the features table; added Configuration section to documentation index; removed "Cloud Configuration" from "Not Yet Implemented" (now implemented via Consul KV)
- **RELEASE_NOTES.md**: Added v0.9.4 release notes

### Test Coverage

51 new tests added across all generators (275 to 326 total):

| Test File                           | New Tests | What They Cover                                                                           |
| ----------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| `rust-server/generator.spec.js`     | 35        | Microservice/gateway with external config disabled, explicit enable, vault+disabled combo |
| `kubernetes/generator.spec.js`      | 6         | Consul statefulset generated but config files not when external config disabled           |
| `kubernetes-helm/generator.spec.js` | 6         | Same pattern for Helm charts                                                              |
| `docker/generator.spec.js`          | 4         | consul.yml generated but central-server-config files not                                  |

## Upgrade Notes

### Existing Projects with Consul

Existing projects with Consul service discovery will continue to work unchanged. The `externalConfig` option defaults to `true`, so regenerating will produce the same output unless you explicitly set it to `false`.

### New Projects

When creating a new gateway or microservice with Consul, you will now see an additional prompt:

```
? Would you like to enable external configuration via Consul KV store? (Y/n)
```

Answer `No` if you only need service discovery without centralized configuration management.

### Vault Projects

If you disable external configuration, Vault secrets management will also be disabled (the Vault prompt will not appear). This is because Vault integration relies on the external config infrastructure for token renewal and cancellation handling.

### Test Compilation

If you have an existing project with circuit breaker, Vault, or external config enabled, regenerate to get the AppState fix in test files. Without this fix, `cargo test` will fail to compile.

---

# Release Notes - v0.9.4

## Overview

JHipster Rust Blueprint v0.9.4 introduces Kubernetes deployment support with both raw manifests and Helm charts, circuit breaker resilience pattern for microservices, and infrastructure manifests for the full technology stack.

## What's New in v0.9.4

### Kubernetes Manifest Generation

Generate Kubernetes deployment manifests for your application:

```bash
jhipster-rust kubernetes
```

- **Deployment & Service**: Application deployment with configurable replicas, resource limits, and liveness/readiness probes
- **ConfigMap & Secret**: Environment configuration and sensitive values (JWT secret, DB passwords)
- **Namespace Support**: Deploy to custom namespaces with auto-generated namespace manifests
- **Service Types**: ClusterIP, NodePort, LoadBalancer, and Ingress support
- **Ingress Controllers**: NGINX and Traefik ingress controller support with custom domain configuration
- **Deployment Script**: `kubectl-apply.sh` helper script with pre-flight Docker image checks and local cluster image loading (Kind/Docker Desktop)

### Helm Chart Generation

Generate parameterized Helm charts for production-grade Kubernetes deployments:

```bash
jhipster-rust kubernetes-helm
```

- **Chart Structure**: Complete Helm chart with `Chart.yaml`, `values.yaml`, and templates
- **Template Helpers**: Reusable `_helpers.tpl` with labels, selectors, and naming conventions
- **Configurable Values**: All deployment settings overridable via `values.yaml`
- **Horizontal Pod Autoscaler**: Optional HPA support with configurable CPU thresholds
- **Helm Script**: `helm-apply.sh` helper script for install, upgrade, uninstall, and template rendering

### Infrastructure StatefulSets

Both K8s manifests and Helm charts generate infrastructure resources based on your application configuration:

| Component  | Condition                 | Resources Generated                                   |
| ---------- | ------------------------- | ----------------------------------------------------- |
| PostgreSQL | `devDatabaseType=pg`      | StatefulSet with PVC, Service                         |
| MySQL      | `devDatabaseType=mysql`   | StatefulSet with PVC, Service                         |
| MongoDB    | `devDatabaseType=mongodb` | StatefulSet with PVC, Service, init Job for seed data |
| Consul     | Service discovery enabled | StatefulSet with PVC, Service                         |
| Kafka      | Message broker enabled    | Zookeeper + Kafka StatefulSets with PVCs, Services    |
| Keycloak   | OAuth2 authentication     | Deployment with Service                               |
| Prometheus | Monitoring enabled        | Deployment + Grafana Deployment with Services         |

### Circuit Breaker Pattern

Resilience pattern for HTTP calls to external services, preventing cascading failures in microservices architecture:

- **Three States**: Closed (normal), Open (rejecting), Half-Open (testing recovery)
- **Configurable Thresholds**: Failure rate, sliding window size, wait duration, request timeout
- **Per-Service Circuits**: Independent circuit breakers for each upstream service
- **Prometheus Metrics**: Circuit breaker state transitions and request counts (when monitoring enabled)
- **Resilient HTTP Client**: `ResilientHttpClient` wrapper with automatic circuit breaker integration
- **Environment Configuration**: All settings configurable via `.env` or environment variables

### Circuit Breaker Configuration

| Variable                                    | Description                            | Default |
| ------------------------------------------- | -------------------------------------- | ------- |
| `CIRCUIT_BREAKER_ENABLED`                   | Enable/disable circuit breaker         | `true`  |
| `CIRCUIT_BREAKER_FAILURE_RATE_THRESHOLD`    | Failure rate to open circuit (0.0-1.0) | `0.5`   |
| `CIRCUIT_BREAKER_SLIDING_WINDOW_SIZE`       | Number of calls in sliding window      | `100`   |
| `CIRCUIT_BREAKER_WAIT_DURATION_SECS`        | Seconds circuit stays open             | `60`    |
| `CIRCUIT_BREAKER_PERMITTED_CALLS_HALF_OPEN` | Calls allowed in half-open state       | `10`    |
| `CIRCUIT_BREAKER_REQUEST_TIMEOUT_MS`        | Request timeout in milliseconds        | `30000` |

### Documentation

- **KUBERNETES.md**: Comprehensive Kubernetes deployment guide covering both Helm and raw manifests
- **CIRCUIT_BREAKER.md**: Detailed circuit breaker pattern documentation with state diagrams and configuration
- **README Updates**: Updated features table with Kubernetes, Helm, and circuit breaker entries

## Upgrade Notes

### Existing Projects

To add Kubernetes support to an existing project:

1. Navigate to your project directory
2. Run `jhipster-rust kubernetes` for raw manifests or `jhipster-rust kubernetes-helm` for Helm charts
3. Build your Docker image: `docker build -t <appname>:latest .`
4. Deploy: `./k8s/kubectl-apply.sh apply` or `./helm/helm-apply.sh install`

### Circuit Breaker

The circuit breaker is enabled by default for gateway and microservice applications. To disable it:

```env
CIRCUIT_BREAKER_ENABLED=false
```

---

# Release Notes - v0.8.0

## Overview

JHipster Rust Blueprint v0.8.0 introduces comprehensive CI/CD support for automated building, testing, and deployment of generated Rust projects.

## What's New in v0.8.0

### CI/CD Integration

- **GitHub Actions**: Generate `.github/workflows/main.yml` with complete CI pipeline
- **GitLab CI**: Generate `.gitlab-ci.yml` with equivalent pipeline stages
- **Local Testing with Act**: Run GitHub Actions locally using [act](https://github.com/nektos/act) for faster iteration

### CI Pipeline Features

The generated CI pipelines include:

| Stage         | Description                                     |
| ------------- | ----------------------------------------------- |
| **Build**     | `cargo build --release` with dependency caching |
| **Lint**      | `cargo clippy -- -D warnings`                   |
| **Test**      | `cargo test` with database services             |
| **Docker**    | Optional Docker image build and publish         |
| **SonarQube** | Optional code quality analysis                  |

### Database-Specific CI Support

- **PostgreSQL**: Service container with proper health checks, single-threaded tests to avoid migration conflicts
- **MySQL**: Service container with MySQL 8.0, single-threaded test execution
- **MongoDB**: Service container with MongoDB 7
- **SQLite**: No external services needed

### Kafka Support in CI

- **CMake Installation**: Automatic installation of cmake for building `rdkafka` native library
- **Build Dependencies**: Proper handling of librdkafka compilation in CI environment

### Bug Fixes

- **Clippy Warnings**: Fixed "useless format!" lint in `consul_config.rs`
- **Clippy Warnings**: Removed placeholder `assert!(true)` test in OAuth2 account handler
- **Test Parallelism**: Fixed PostgreSQL/MySQL duplicate key errors by using `--test-threads=1`

### Documentation

- **CI_CD.md**: New comprehensive documentation included in generated projects
- **README Updates**: Added CI/CD section and updated features table
- **Troubleshooting**: Common CI issues and solutions documented

## Usage

Generate CI/CD configuration for your project:

```bash
jhipster-rust ci-cd
```

This will prompt you to select:

- GitHub Actions and/or GitLab CI
- Docker image publishing (optional)
- SonarQube analysis (optional)

### Running CI Locally with Act

```bash
# Install act (macOS)
brew install act

# Run the workflow (Apple Silicon)
act push --container-architecture linux/amd64

# Run the workflow (Intel/Linux)
act push
```

## Upgrade Notes

### Existing Projects

To add CI/CD to an existing project:

1. Navigate to your project directory
2. Run `jhipster-rust ci-cd`
3. Select your preferred CI platform(s)
4. Commit the generated configuration files

### Consul Projects

If you have an existing project with Consul service discovery, regenerate to get the Clippy fix for `consul_config.rs`.

### OAuth2 Projects

If you have an existing OAuth2 project, regenerate to remove the placeholder test in `account.rs` that triggers Clippy warnings.

---

# Release Notes - v0.7.8

## Overview

JHipster Rust Blueprint v0.7.8 includes bug fixes and improvements for MySQL Docker support and email integration across all database types.

## What's New in v0.7.8

### MySQL Docker Support

- **MySQL Docker Template**: Added `mysql.yml` Docker Compose template for MySQL projects
- **MySQL 8.4**: Uses MySQL 8.4 container with proper health checks
- **Consistent Credentials**: MySQL Docker, `.env`, and `test_utils.rs` all use the same credentials (`root:root`)

### Email Integration Improvements

- **Smart Base URL Resolution**: For monolith apps with `SERVE_STATIC_FILES=true`, email links now automatically use the server's host and port (e.g., `http://localhost:8080`) instead of requiring manual configuration
- **Configurable Override**: `MAIL_BASE_URL` can still be set explicitly to override auto-detection (useful for reverse proxy setups)
- **Email Template Fixes**: Renamed email templates to `.html.ejs` for proper EJS processing with dynamic app name

### Code Quality

- **Cargo Clippy Fixes**: Resolved minor Clippy warnings in generated templates
- **DTO Improvements**: Enhanced DTO serialization with `#[serde(skip_serializing_if)]` for optional fields
- **Handler Improvements**: Better error handling and response formatting in entity handlers

### Microservices Documentation

- **MICROSERVICES.md Guide**: New comprehensive documentation for microservice deployment
- **Architecture Overview**: Diagrams and explanations for microservices architecture
- **Inter-Service Communication**: Token propagation and HTTP client patterns
- **Docker Compose Examples**: Multi-service deployment configurations
- **Health Checks**: Kubernetes-ready liveness and readiness probes

### Documentation

- **Test Snapshots**: Updated test snapshots to include new `docs/` files
- **README Updates**: Added microservices deployment section and feature documentation

## Upgrade Notes

### Email Configuration for Monolith Apps

If you have an existing monolith project with `SERVE_STATIC_FILES=true`, you can now remove or comment out `MAIL_BASE_URL` from your `.env` file. The server will automatically construct the correct URL from `APP_HOST` and `APP_PORT`.

Before:

```env
SERVE_STATIC_FILES=true
MAIL_BASE_URL=http://localhost:8080
```

After:

```env
SERVE_STATIC_FILES=true
# MAIL_BASE_URL is auto-detected when SERVE_STATIC_FILES=true
```

### MySQL Projects

For MySQL projects, ensure you have the new `docker/mysql.yml` file. If upgrading an existing project, you may need to regenerate or manually create this file.

---

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
