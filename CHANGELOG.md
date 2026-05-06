# Changelog

All notable changes to `generator-jhipster-rust` are documented here.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the at-a-glance index. For long-form per-release narrative — rationale, implementation notes, gotchas, and migration commands — see [RELEASE_NOTES.md](RELEASE_NOTES.md).

## [Unreleased]

DX papercut cleanup landing on `main` ahead of the next release. All non-breaking; nothing in `0.9.8`-generated projects changes until you regenerate.

### Fixed

- Generated `README.md` no longer duplicates content 8 times. The `.jhi.rust.ejs` extension hooked JHipster's fragment-merge mechanism without fragment guards, inserting the template at every fragment slot in the parent README. Renamed to `README.md.ejs` (standalone override). 1001 → 138 lines for a default microservice scaffold. (commit `afcaedf`)
- Generated `.env.example` now ships alongside `.env` so the README's first setup step works. The example uses a known-default sentinel for `JWT_SECRET`, ensuring `cp .env.example .env && cargo run` FATALs at startup rather than silently signing tokens with a placeholder. (commit `44364f6`)
- `jhipster-rust --version` and other CLI invocations no longer print `INFO! No custom commands found within blueprint` from the upstream loader. Added `cli/commands.js` exporting an empty default object to satisfy `_getBlueprintCommands`'s probe. (commit `ed6e945`)
- `jhipster-rust app --help` now prints a Rust Blueprint quick reference between the Rust badge and JHipster's full Options block. Surfaces the four flags that actually shape a Rust scaffold (`--application-type`, `--db`, `--auth`, `--service-discovery-type`) with their valid choices, including `--db`'s missing enumeration. (commit `fd43639`)
- Source `README.md` gains a `# What This Does in 60 Seconds` section above `# Introduction`, so a developer landing from a Google search hits the magical-moment pitch (copy-paste commands plus a dense outcome paragraph naming all three app types and frontend choices) before the feature matrix. (commit `c05a50a`)

### Documentation

- New `CHANGELOG.md` (this file) at repo root indexes every release from `0.7.4` through `0.9.8` plus this `[Unreleased]` block, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Long-form per-release narrative stays in `RELEASE_NOTES.md`. (commit `a8004d8`)
- Three-line shell comment added above the `[ -z ]` test in `docker-entrypoint.sh.ejs` documenting the deliberate empty-vs-unset convergence and pointing at the Rust binary's `is_sentinel("")` as the layer that catches the bare `cargo run` path. Future maintainers no longer need to grep for `is_sentinel` to understand why empty `JWT_SECRET` is allowed to generate. (commit `551c235`)

## [0.9.8] — 2026-05-03

Security hardening release. Closes 9 of 14 audit findings non-breakingly. The remaining breaking-fix half (admin/admin seed, HttpOnly cookies, OIDC client secret, password minimums) is deferred to a future auth-hardening release.

### Added

- New `docker-entrypoint.sh` generates a per-container random `JWT_SECRET` when unset (32-byte hex from `/dev/urandom`) and refuses to start when `JWT_SECRET` matches a known-default sentinel. POSIX `sh`, no openssl dependency, lints clean under `shellcheck`.
- New `server/src/config/sentinels.rs` is the single source of truth for the JWT secret denylist (the bare `change-me-in-production`, two longer historical defaults, the legacy timestamp pattern, and the empty string). Defense-in-depth catches the K8s static-manifest path that would bypass the entrypoint.
- New `entrypoint.spec.js` (7 cases) exercises the entrypoint behavior matrix in CI; `shellcheck` runs on the generated entrypoint in the samples-CI matrix.
- `.github/dependabot.yml` keeping pinned third-party action SHAs current.

### Changed

- OAuth2 `state` parameter generated from `OsRng`, stored in HttpOnly (and Secure when `app_https`) cookie before redirect, constant-time compared via `subtle::ConstantTimeEq` on callback. Replaces the timestamp-based state with no validation.
- CORS becomes environment-aware: development keeps the permissive `Any` defaults; production reads `CORS_ALLOWED_ORIGINS` (comma-separated) and refuses to start when missing or empty.
- Container runtime runs as UID 1001. K8s `Deployment` enforces `runAsNonRoot: true`, `runAsUser: 1001`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`. Non-SQLite paths add a writable `/tmp` `emptyDir` so `readOnlyRootFilesystem: true` does not crash on first temp write.
- Helm `templates/secret.yaml` uses lookup-or-generate for `JWT_SECRET` and `DB_PASSWORD`: `helm install` works on first run; `helm upgrade` preserves values so existing tokens stay valid and the persisted DB stays readable.
- `.github/workflows/samples.yml` pins `dtolnay/rust-toolchain` and `Swatinem/rust-cache` to commit SHAs.
- Dependency hygiene: `eslint` 9.26.0 → 9.39.4; `npm overrides` for `fast-xml-parser`, `lodash`, `lodash-es`, `yaml`. `npm audit` reports 0 vulnerabilities (was 24).

### Fixed

- Scaffold-time `JWT_SECRET` in `.env` uses `crypto.randomBytes(32).toString('hex')`. Replaces the timestamp-based default that was brute-forceable for anyone who knew approximately when the project was scaffolded.
- Static `app-secret.yml` no longer ships hardcoded plaintext sentinels. `kubectl apply -f` of the unmodified manifest now fails loudly rather than silently shipping known credentials.
- Both K8s static `app-configmap.yml` and Helm `values.yaml` no longer ship `DATABASE_URL` with a literal `postgres:postgres` / `root:root` credential. `DATABASE_URL` is assembled inside the Deployment via `$(VAR)` env substitution against the chart-managed Secret.
- Both consul-config-configmap variants and both vault-init Job variants no longer write the bare `change-me-in-production` JWT seed. The bare form was added to the entrypoint and Rust binary's denylists for any future regression.
- Dockerfile no longer bakes `ENV DATABASE_URL=...` or `ENV MONGODB_URI=...` defaults. Apps `expect()` the env var at startup, flipping the failure mode from "silently use bad creds" to "fail loud at startup."

### Migration

Existing `0.9.7`-generated apps untouched on disk. Most dev workflows continue to work after regeneration. See [RELEASE_NOTES.md § What changes for `docker run` / `kubectl apply` / `helm install` / production CORS / container UID](RELEASE_NOTES.md) for specifics.

## [0.9.7] — 2026-04-10

Largest release since `0.9.0`. Upgrades the blueprint to JHipster `9.0.0`, hardens entity generation across all four databases, and adds 44 regression tests. **Non-backward-compatible** — existing `0.9.6`-generated projects need to be regenerated.

### Breaking

- Requires JHipster `9.0.0` (was `8.11.0`). Node `22.18+` or `24.11+` (Node 18 / 20 dropped).
- Sub-generator namespaces restructured: `bootstrap-application/` → `base-application/generators/bootstrap/`; `kubernetes-helm/` → `kubernetes/generators/helm/`. CLI: `jhipster-rust kubernetes:helm` (was `kubernetes-helm`).
- Workspace-oriented client layout: Angular / React / Vue client moved from project root to `client/` subfolder. Webapp build output moved from `target/static/` to `server/dist/static/`.
- Angular component file renames: drop `.component.{ts,html,scss,spec.ts}` suffixes per JHipster 9 convention.
- Angular dev server is Vite-based (was Webpack). Test runner is Vitest (Jest removed).

### Added

- New `base-application:bootstrap` sub-generator declares `backendType = 'Rust'` so JHipster does not try to compose the Spring Boot backend.
- 44 new regression tests across `entity-generation.spec.js`, `client/dev-experience.spec.js`, `entity/regression.spec.js` (389 → 433 total).

### Fixed

- `rust-server` now depends on JHipster server bootstrap, populating `entity.persistClass` etc. for the Rust entity templates.
- `backfillRelationshipForRust` helper synthesises `relationship.otherEntityTableName` and many-to-many `joinTable.name` for both SQL and MongoDB. Fixes broken SQL like `_id INTEGER NOT NULL REFERENCES (id) ON DELETE CASCADE`.
- Many-to-many join tables now live in their own migration files with timestamps strictly after both endpoint tables. PostgreSQL/MySQL FKs are no longer silently dropped.
- ALTER TABLE migrations auto-emitted when a new entity introduces a back-reference column to an existing table.
- `diesel migration run` runs in the END phase so fresh generation produces a project that compiles with one `cargo build`.
- Diesel queries use `.select(Entity::as_select())` for column-name matching, surviving `ALTER TABLE ADD COLUMN`.
- `RelationshipId::deserialize` accepts string-encoded integer IDs, fixing React multi-selects.
- DTO `#[serde(rename = "...")]` on snake_case JHipster field names that do not round-trip through `rename_all = "camelCase"`.
- `npm start` / `build` / `test` / `lint` work from the workspace root by forwarding to `npm run -w client/`.
- Angular swagger UI iframe assets copied via a postinstall helper for the Vite dev server.

### Migration

Recommended: `rm -rf client/ server/src/app/ target/static/ client-src/ && jhipster-rust --force`. See [RELEASE_NOTES.md § Migrating an existing v0.9.6 project](RELEASE_NOTES.md) for the full playbook.

## [0.9.6] — 2026-03-29

Distributed tracing for microservice and gateway apps; deployment fixes across Docker, K8s, and Helm.

### Added

- Distributed tracing: choose Zipkin (HTTP exporter) or Jaeger (OTLP gRPC). New `tracing_config.rs`, `docker/tracing.yml`, K8s manifests, Helm template, and `docs/DISTRIBUTED_TRACING.md`. Not available for monoliths.
- 63 new tests (326 → 389).

### Fixed

- Production ribbon: `display-ribbon-on-profiles` is now always `"dev"`, so the Angular UI ribbon correctly hides in production across monolith, microservice, and gateway.
- `APP_ENV: "development"` moved to common config block in K8s configmaps and Helm values; monolith deployments no longer inherit `APP_ENV=production` from the Dockerfile.
- Microservice port `8081` (was hardcoded `8080`) across configmaps, deployments, services, monitoring, and `kubectl-apply.sh`.
- PostgreSQL credentials in `.env` and `test_utils.rs` use `<%= baseName %>` user with no password, matching `docker/postgresql.yml`'s trust auth.
- Jaeger Docker image: `jaegertracing/all-in-one:latest` (was `jaegertracing/jaeger:2`, which does not exist on Docker Hub).

## [0.9.5] — 2026-03-28

External configuration via Consul KV becomes optional, separated from service discovery.

### Added

- New CLI prompt: enable external configuration via Consul KV (defaults to Yes for backward compatibility). Shown only when Consul service discovery is selected.
- New `docs/CONFIG.md` covering all environment variables organised by feature, configuration layers, hot-reloadable settings, Consul KV management examples, and a production checklist.
- 51 new tests (275 → 326).

### Changed

- `serviceDiscoveryConsul` flag now controls service registration / discovery only. New `externalConfig` flag controls Consul KV config loading, hot-reload, `remote_config.rs`, `config_watcher.rs`. Vault now requires `externalConfig` (was implicitly enabled with Consul).

### Fixed

- Dockerfile `COPY client/` step skipped when `skipClient=true`.
- Test AppState initialisers (`test_utils.rs`, `user.rs`, `account.rs`, entity handlers) include `circuit_breaker`, `remote_config`, `vault_service` fields. Without this, `cargo test` failed to compile when these features were enabled.

## [0.9.4] — 2026-03-27

Kubernetes deployment support and circuit breaker resilience pattern.

### Added

- Kubernetes manifest generation (`jhipster-rust kubernetes`): Deployment, Service, ConfigMap, Secret, Namespace, Ingress (NGINX or Traefik), and `kubectl-apply.sh`.
- Helm chart generation (`jhipster-rust kubernetes-helm`): `Chart.yaml`, `values.yaml`, `_helpers.tpl`, optional HPA, and `helm-apply.sh` for install / upgrade / uninstall / template.
- Infrastructure StatefulSets generated for PostgreSQL, MySQL, MongoDB, Consul, Kafka (with Zookeeper), Keycloak, Prometheus + Grafana — gated on the corresponding feature flags.
- Circuit breaker pattern for HTTP calls in microservice / gateway apps: three states (Closed / Open / Half-Open), configurable thresholds, per-service circuits, Prometheus metrics integration, `ResilientHttpClient` wrapper.
- New `docs/KUBERNETES.md` and `docs/CIRCUIT_BREAKER.md`.

## [0.8.0] — 2026-01-11

CI/CD support.

### Added

- GitHub Actions workflow generation (`.github/workflows/main.yml`) with build, lint, test, optional Docker publish, optional SonarQube.
- GitLab CI configuration (`.gitlab-ci.yml`) with equivalent pipeline stages.
- Local CI testing with [act](https://github.com/nektos/act).
- Database service containers in CI for PostgreSQL, MySQL, MongoDB. SQLite needs none.
- CMake auto-installation in CI for Kafka projects (rdkafka native build).
- New `docs/CI_CD.md`.

### Fixed

- Clippy "useless format!" lint in `consul_config.rs`.
- Clippy placeholder `assert!(true)` in OAuth2 account handler.
- PostgreSQL / MySQL test parallelism: `--test-threads=1` to avoid duplicate-key flakes.

## [0.7.8] — 2026-01-08

MySQL Docker support and email integration improvements.

### Added

- New `docker/mysql.yml` Docker Compose template for MySQL projects (MySQL 8.4 with health checks).
- New `docs/MICROSERVICES.md` covering microservice deployment, inter-service communication, token propagation, and K8s health checks.

### Changed

- `MAIL_BASE_URL` auto-detected from `APP_HOST:APP_PORT` for monolith apps with `SERVE_STATIC_FILES=true` (was always required).
- DTOs use `#[serde(skip_serializing_if)]` for optional fields.
- Email templates renamed to `.html.ejs` for proper EJS processing.

### Fixed

- MySQL Docker, `.env`, and `test_utils.rs` credentials all consistent (`root:root`).

## [0.7.4] — 2026-01-05

Initial public release.

### Added

- Axum web framework with Tokio async runtime, Tower middleware, structured logging.
- Multi-database support: SQLite, PostgreSQL, MySQL (Diesel ORM), MongoDB (native driver).
- Authentication: JWT (Argon2 password hashing) or OAuth2 / OIDC (Keycloak with JWKS validation).
- Entity generation with full CRUD, validations, pagination, sorting, and all relationship types (`ManyToOne`, `OneToMany`, `OneToOne`, `ManyToMany`).
- API documentation: Swagger UI at `/swagger-ui`, Scalar UI at `/scalar`, OpenAPI 3.0 spec at `/v3/api-docs`.
- Email integration: SMTP via Lettre + Tera templates, account activation, password reset, MailHog for local dev.
- Static SPA hosting for monolith mode (Angular / React / Vue served from the Rust backend).
- Multi-stage Dockerfile and Docker Compose for full-stack local dev.
- Frontend support: Angular, React, Vue (full JHipster clients).

[Unreleased]: https://github.com/pandeyn/generator-jhipster-rust/compare/v0.9.8...HEAD
[0.9.8]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.8
[0.9.7]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.7
[0.9.6]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.6
[0.9.5]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.5
[0.9.4]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.4
[0.8.0]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.8.0
[0.7.8]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.7.8
[0.7.4]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.7.4
