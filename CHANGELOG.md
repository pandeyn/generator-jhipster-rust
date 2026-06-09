# Changelog

All notable changes to `generator-jhipster-rust` are documented here.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file is the at-a-glance index. For long-form per-release narrative — rationale, implementation notes, gotchas, and migration commands — see [RELEASE_NOTES.md](RELEASE_NOTES.md).

## [1.0.1] — 2026-06-09

End-to-end integration matrix shipped. The generator now runs an opt-in CI workflow that scaffolds every dimension combination on a real DB container (postgres / mysql / mongo / sqlite), executes `cargo test` against it, brings up the full `docker compose` stack, polls `/api/health`, and runs Cypress headless against the 5 frontend-bearing scaffolds. That work caught 24 real generator bugs that would have shipped to v1.0.1 untouched. Coverage rose from **60.11% → 84.41%** on the canonical scaffold, and the CI gate ratcheted from 50 to 75 in one bundled step at the end of Phase 3 (`samples.yml` `Coverage Gate`).

### Added

- **`e2e.yml` integration matrix** ([.github/workflows/e2e.yml](.github/workflows/e2e.yml)). 13 jobs total: 4 cargo-test jobs (sqlite / postgres / mysql / mongo, each with a per-DB service container), 3 docker-compose-smoke jobs (postgres / mysql / mongo, bringing up the scaffold's own `docker/app.yml`), and 5 Cypress headless jobs covering every frontend-bearing scaffold. An `e2e-check` aggregator gates the matrix on a single status. Triggers: `pull_request` with the `e2e` label, manual dispatch, and nightly at 08:00 UTC.
- **`tarpaulin-matrix.yml` informational coverage matrix** ([.github/workflows/tarpaulin-matrix.yml](.github/workflows/tarpaulin-matrix.yml)). 8 jobs (one per scaffold across 4 DB dimensions) that run `cargo tarpaulin` and upload per-scaffold `cobertura.xml` + `tarpaulin-report.html` as 14-day artifacts. Triggers: manual dispatch, nightly at 09:00 UTC, and `pull_request` with the `tarpaulin` label. **Not gating** (per locked decision #3) — the release-blocking coverage gate stays on `samples.yml`'s canonical `microservice-cb` job at `--fail-under 75`.
- **6 new JDL samples** in [`.blueprint/generate-sample/templates/samples/`](.blueprint/generate-sample/templates/samples/): `mono-sqlite-jwt-ng`, `mono-pg-jwt-react`, `mono-mysql-oauth2-vue`, `mono-mongo-jwt-ng` (converted from yo-rc form, with `clientFramework` + `testFrameworks [cypress]` + Customer/Order entities baked in), plus `gateway-mongo-oauth2-react` (stress-test combination: gateway + mongo + OAuth2 + React + Cypress, none of those four combined before this release).
- **Track 1-a entity-regen test fixture** at [.github/workflows/fixtures/relationships.jdl](.github/workflows/fixtures/relationships.jdl). Author / Book / Tag entities with `OneToMany` (Author→Book) and `ManyToMany` (Book↔Tag) relationships, applied on top of each matrix scaffold via `jhipster jdl --force` to exercise the incremental-regen path (the migration-timestamp-collision fix below was needed because this fixture overlaid an entity with the same `changelogDate` as the existing scaffold's seed migration).
- **`PREPARING_EACH_ENTITY` hook** in [`generators/rust-server/generator.js`](generators/rust-server/generator.js). Re-runs the reserved-word check using the published `isReservedPostgresqlKeyword` from `generator-jhipster/generators/spring-boot/generators/data-relational/support`, then prefixes `jhi_` when upstream missed it. Bug #17 fix.
- **`OIDC_INTERNAL_URI` env var** in the generated OAuth2 scaffold's `OAuth2Config`. Splits the browser-facing issuer URL from the server-side endpoint URL so docker-compose stacks can route the browser to `http://localhost:9080` while the app container reaches Keycloak at `http://keycloak:9080`. Bug #18 fix.
- **`mongodb_init.js` mount + bootstrap** in generated mongo scaffolds. The init script is now mounted into the container at `/docker-entrypoint-initdb.d/init.js` (via [docker/mongodb.yml.ejs](generators/docker/templates/docker/mongodb.yml.ejs)) and runs `rs.initiate()` + primary-election wait inline so the seeded users + authorities actually exist on first boot. Bug #22 fix.
- **Authority CRUD** in the generated user-management handler. `POST /api/authorities`, `GET /api/authorities/:name`, `DELETE /api/authorities/:name`, plus matching `UserService::find_all_authorities`, `create_authority`, `delete_authority` against the existing authorities table/collection on both SQL and MongoDB paths. 7 new handler tests. Bug #14 fix.
- **Phase 2d, Phase 3a/b/c coverage**: `services::*_service` sort branches + M2O-lookup coverage (2d), wiremock-backed `consul_service` + `vault_service` + `config_watcher` + `tracing_config` tests (3a/b/c). +~24pp on the canonical scaffold across the four phases.

### Changed

- **Coverage gate ratcheted 50 → 75** in `samples.yml`'s `coverage` job (locked decision #8 bundled the planned 50→60 and 60→70 intermediate ratchets into a single post-Phase-3 step, since Phase 2 + Phase 3a delivered to 83.71% — well past 60 — making intermediate ratchets bookkeeping).
- **5 scaffold samples migrated from yo-rc to JDL**. `mono-sqlite-jwt-ng/.yo-rc.json` → `mono-sqlite-jwt-ng.jdl`; same for `mono-pg-jwt-react`, `mono-mysql-oauth2-vue`, `mono-mongo-jwt-ng`. The JDL form bakes in `clientFramework` + `testFrameworks [cypress]` + entities (previously `skipClient: true` with no entities), enabling Cypress jobs against each. The sample registry resolves the JDL by the same name with no e2e-matrix wiring changes.
- **OAuth2 scaffolds bake Keycloak `KC_HOSTNAME` config**. [docker/keycloak.yml.ejs](generators/docker/templates/docker/keycloak.yml.ejs) now sets `KC_HOSTNAME=localhost` + `KC_HOSTNAME_STRICT=false` + `KC_HOSTNAME_STRICT_BACKCHANNEL=false` so the `iss` claim Keycloak emits is fixed regardless of inbound route — server-side token validation matches the browser-facing issuer URI. Bug #18 follow-on.
- **`OIDC_INTERNAL_URI` derivation in `OAuth2Config`**. `authorization_endpoint` and `end_session_endpoint` derive from `OIDC_ISSUER_URI` (browser-facing); `jwks_uri`, `token_endpoint`, `userinfo_endpoint` derive from `OIDC_INTERNAL_URI` (server-side, defaults to `OIDC_ISSUER_URI` for non-docker setups). Bug #19 follow-on.
- **User-management `CreateUserDto.password` is now `Option<String>`** in the generated server. When absent, the SQL and MongoDB handlers generate a `uuid::Uuid::new_v4()` random password; the user can't log in until they reset (the UUID is unguessable), matching JHipster's admin-create-user flow. 15 existing test fixtures updated to `Some(...)`. Bug #13 fix.
- **Mongo entity codegen** (`_entityFileName_dto.rs.ejs`, `_entityFileName_service_mongodb.rs.ejs`, `_entityFileName_.rs.ejs`, `_entityFileName_mongodb.rs.ejs`) gained conditional emission guards for DateTime helpers, audit-field sort-arm dedup, item_id bind on M2M-only paths, and BigDecimal → `f64` test fixtures. Bugs #20a/b/c + #21 fix.

### Fixed

24 generator bugs caught by the new e2e matrix. Every one would have shipped to v1.0.1 untouched without the lake of integration tests.

- **#13 — User-management `POST /api/admin/users` requires `password`**. The Cypress test posted `{login, email}` (matching the JHipster admin-create-user convention) and got 422 `missing field 'password'`. `CreateUserDto.password` is now `Option<String>` with a server-generated UUID fallback when absent.
- **#14 — Authority handler missing POST / GET-by-name / DELETE**. `authority_routes()` only registered `GET /` and returned a hard-coded `vec!["ROLE_ADMIN", "ROLE_USER"]` that never touched the database. POST returned 405 and the Cypress entity test failed; the missing GET-by-name (caught when fixing POST) caused the Angular detail-view to null-deref. Now full CRUD against the existing `authorities` table (SQL) / collection (MongoDB) with proper 400/404 handling and 7 new tests.
- **#17 — Sqlite scaffolds with reserved-word entity names emit `CREATE TABLE order (...)`**. Upstream's `configureEntityTable` only prefixes `jhi_` when `isReservedTableName(name, prodDatabaseType)` returns true, but its per-DB lookup map has MYSQL / POSTGRESQL / ORACLE / MSSQL — no SQLITE. So on sqlite, `Order` slipped through and the migration crashed at `near "order": syntax error`, cascading into 150 cargo test failures. Our new `PREPARING_EACH_ENTITY` hook re-checks against the postgres reserved-word list (a practical superset) and applies the same `jhi_` prefix.
- **#18 — OAuth2 token exchange unreachable inside docker compose**. The browser reaches Keycloak at `http://localhost:9080` (host port forward) but the app container reaches it at `http://keycloak:9080` (docker network). `OIDC_ISSUER_URI` was used for both, defaulting to `localhost:9080` — which from inside the app container is the app itself. Token exchange POSTed there got "Connection refused" and every OAuth2 cypress test failed. Split into browser-facing `OIDC_ISSUER_URI` + server-side `OIDC_INTERNAL_URI`; the `iss` claim is pinned to `localhost:9080` via `KC_HOSTNAME=localhost` on Keycloak. **High-impact**: every OAuth2 docker-compose user was affected. The cargo test layer used wiremock stubs (didn't catch it); the docker-compose smoke only checked `/api/health` (didn't authenticate). Cypress + browser was the first layer that exercised the real OAuth2 flow.
- **#19 — OAuth2 logout URL returned to browser was the docker-internal hostname**. After #18 fix, `end_session_endpoint` (derived from `internal_uri`) made the SPA navigate the browser to `http://keycloak:9080/...` — which the browser can't resolve. 60s page-load timeout in `logout.cy.ts`. Re-categorized endpoints: `authorization_endpoint` + `end_session_endpoint` are browser-facing (external base); `token_endpoint` + `jwks_uri` + `userinfo_endpoint` are server-internal.
- **#20a — mongo DTO unused-import on optional-only DateTime fields**. The mongo branch of `_entityFileName_dto.rs.ejs` imported both `deserialize_bson_datetime` (required) and `deserialize_option_bson_datetime` (optional) unconditionally. Mirror the SQL-side conditional that already gated on `hasRequiredDateTimeFields`.
- **#20b — duplicate sort-field match arm when entity has `createdDate` / `lastModifiedDate` as a user field**. `_entityFileName_service_mongodb.rs.ejs` emitted user-field arms PLUS unconditional audit-field arms, producing `"createdDate" => "created_date"` twice (clippy unreachable-pattern). Guarded the audit arms on `!fields.some(f => f.fieldName === '<name>')`.
- **#20c — unused `item_id` + clone-on-Copy in mongo entity handler with M2O-only rels**. `let item_id = item.id.clone()` was emitted unconditionally inside `find_all`'s loop, but only the M2M-owner branch used it. Gated the bind on `manyToManyOwnerRels.length > 0` and dropped the redundant clone (`Option<ObjectId>` is `Copy`).
- **#21 — BigDecimal test fixtures emit `bigdecimal::BigDecimal::parse(...)` on mongo scaffolds**. Production code maps BigDecimal → `f64` on mongo (the bigdecimal crate isn't a dep for mongo per the 1-c.0 fix in `generator.js`), but the DTO + model test fixtures still emitted the parse call. Cargo test failed E0433 (DTO) and E0308 (model). Added conditional emission: mongo gets `42.5`/`1.0` literal; SQL keeps the BigDecimal parse.
- **#22 — `scripts/mongodb_init.js` was never mounted into the mongo container**. The script existed in every generated mongo scaffold but `docker/mongodb.yml.ejs` didn't have the bind mount. The users + authorities collections stayed empty on first boot, so any cypress / manual flow that authenticated with the documented `admin/admin` or `user/user` creds got 401. After mounting, a second issue surfaced: the mongo image's docker-entrypoint runs init scripts BEFORE our healthcheck calls `rs.initiate()`, so the writes failed "not primary" and crashed the container. Inlined `rs.initiate()` + primary-election wait at the top of the init script. **High-impact**: every mongo docker-compose user had a silently-empty database.
- **#23 — diesel `[print_schema]` overwrote `schema.rs` and stripped needles**. `generators/rust-server/templates/diesel.toml.ejs` declared a `[print_schema]` section, so `diesel migration run` (invoked during Track 1-a.3's entity-regen step) regenerated schema.rs from DB introspection and stripped the `jhipster-needle-add-entity-schema` markers our entity-emit code uses. Removed the `[print_schema]` section.
- **#24 — entity migration timestamp collisions on incremental `jhipster jdl`**. Two entities sharing the same `changelogDate` prefix (e.g. an existing `20260608044255_create_jhi_order` + a newly-added `20260608044255_create_author`) had diesel dedup them by version prefix and silently skip the second migration, producing `relation "author" does not exist` at the next cargo test. `generator.js` now reads existing migration prefixes and bumps new timestamps past collisions.
- **12 docker-compose / test-infra bugs caught by 1-a.2 + 1-a.4**: `context: .` resolved to `docker/` not the project root (Dockerfile not found); sqlite bind-mount uid-1001 permission errors; Dockerfile `ENV APP_ENV=production` refused dev compose without CORS; duplicate `db:` / `postgresql:` services binding the same host port; `extends:` not inheriting top-level volume declarations; empty `volumes:` keyword for postgres (no entries); MongoDB replSet's `localhost:27017` advertisement breaking cross-container clients (needed `?directConnection=true`); plus 5 more in the cargo-test layer (email-pattern fixture, MySQL `DATETIME(6)` for sort-test stability, consul fixture missing MongoDB keys, and 2 more entity-regen issues).

### Documentation

- This release exists. CHANGELOG and RELEASE_NOTES describe what shipped, why, and the impact path for each high-severity bug. The 24-bug list reads like a how-to for future maintainers: each fix names the file path it changed, the cypress / cargo test that surfaced it, and a one-line explanation of the regression risk that motivates the test layer that caught it.

### Backward compatibility

Non-breaking. The five scaffold dimensions accept the same values; the sample registry resolves yo-rc dirs and `.jdl` files under the same name. Existing v1.0.0-generated apps are untouched on disk. Regenerating a scaffold to v1.0.1 brings in:

- The `OIDC_INTERNAL_URI` env var on OAuth2 docker setups — optional, falls back to `OIDC_ISSUER_URI`.
- The `KC_HOSTNAME` Keycloak config on docker stacks — only changes the `iss` claim if not previously pinned.
- The `mongodb_init.js` mount — adds the bind mount; harmless if the file already exists.
- The `jhi_` prefix on sqlite reserved-word entity names — entities named `Order`, `User`, `Group`, etc. on sqlite will get the prefix on first `diesel migration run` of the regenerated scaffold. Old scaffold databases keep the old table name; new generation is the right shape.
- Authority CRUD endpoints — additive.

### Deferred to v1.1.x

- CI gate ratchet to 80+ — defer until we have a stable 84-86% trajectory across two release cycles.
- Cypress-side OAuth2 + Vue per-suite improvements — the OAuth2 login path through `cy.session()` is fragile when entity-CRUD suites run interleaved; revisit in a dedicated phase.
- Proper OAuth2 cypress helpers for non-Keycloak IdPs (Okta, Auth0) — current scaffold has stubs but they're untested in CI.

## [1.0.0] — 2026-05-11

First stable release. Establishes a coverage floor (50% gate in CI, ratcheting per release) and fixes five latent template compilation bugs that broke every entity-based scaffold since v0.9.4 — `cargo check` against a Product/Category JDL now passes on first run. Non-breaking: same five scaffold dimensions, same template names, same generator API. The major version bump signals stability commitment, not breaking change.

Coverage went from a measured **35.67% baseline (v0.9.9)** to **60.11%** (1139/1895 lines) on the canonical microservice-cb scaffold — a +24.4pp gain across Track 1 (Phases 0/1a/1b/1c/1d/2a). Per-file coverage on 11 Tier 1 files at ≥90% (9 of them at 100%); Tier 2's `user_service.rs` at 80.6%. CI's coverage gate hard-fails any PR that drops overall coverage below 50%.

### Added

- **`Samples/Coverage Gate (canonical scaffold)` CI job** in [`samples.yml`](.github/workflows/samples.yml). Spins up a postgres service container per PR, runs `cargo tarpaulin --fail-under 50 -- --test-threads=1` against the microservice-cb scaffold, reports per-file coverage in the job log. Threshold ratchets per release (50 in 1.0.0; 60 planned post-Phase 2; 70 in v1.0.1 after Phase 3).
- **~150 new unit and integration tests** across the generated server templates, covering DTO deserializers (`common.rs`, `pagination.rs`), config `from_env` parsing (`app_config`, `vault_config`, `consul_config`, `metrics_config`), handler routes (`health.rs`, `management.rs`), the JWT auth middleware (`auth.rs`), error response mapping (`app_error.rs`), the OpenAPI registry (`openapi.rs`), and the 8-way sort match in `user_service::find_all` (17 parametrized rstest cases). Test code lives in EJS templates, so every regenerated scaffold gets the same coverage shape.
- **`rstest = "0.21"` and `axum-test`-based handler test patterns** in the generated `server/Cargo.toml`. Both are test-only dev deps with zero runtime cost in the production binary.
- **`.tarpaulin.toml.ejs`** in generated scaffolds, excluding `server/src/main.rs` from coverage denominator (process bootstrap not unit-testable; tests use a separate `test_utils::create_test_state` harness).

### Changed

- **`Samples/sample`, `Samples/gateway-cb`, `Samples/microservice-cb` CI jobs** now invoke the local CLI directly (`node "$GITHUB_WORKSPACE/cli/cli.cjs" generate-sample <name>`) rather than `npx --yes yo jhipster-rust:generate-sample`. The npx path couldn't resolve `generator-jhipster-rust` from `node_modules` because `npm ci` doesn't create a self-link, leaving the Samples workflow red since the day it was added.
- **Generated `server/Cargo.toml`** declares `bigdecimal = { version = "0.4", features = ["serde"] }` and adds `, "numeric"` to diesel features when any JDL entity has a `BigDecimal` field. Previously the dependency was referenced by emitted entity code but never declared, causing E0433 at first `cargo build`.
- **Generated `server/src/db/schema.rs`** now contains `diesel::table!` blocks for every JDL entity, emitted via a new `addEntityToRustSchema` source helper invoked in `POST_WRITING_ENTITIES`. Previously the file shipped empty, so every entity scaffold failed at first `cargo check` with `crate::db::schema::<entity>` unresolved.

### Fixed

- **Generated SQL migrations no longer duplicate audit columns** (`created_by` / `created_date` / `last_modified_by` / `last_modified_date`) when the JDL declares them explicitly. Each audit column is now gated on `!fields.some(f => f.fieldName === '...')` in [`migrations/entity/up.sql.ejs`](generators/rust-server/templates/migrations/entity/up.sql.ejs); applies to postgres, mysql, and sqlite variants. Previously, a JDL field named `createdDate` would generate `CREATE TABLE product (... created_date TIMESTAMP, ..., created_date TIMESTAMP)` and fail `diesel migration run` with `column specified more than once`.
- **Generated entity migrations are topologically ordered by FK dependency.** When entity A has a many-to-one or owning one-to-one to entity B, B's migration timestamp is now guaranteed to sort before A's (the generator bumps timestamps as needed; otherwise prefers each entity's stable `changelogDate`). Previously, JDL-declaration order leaked into migration filenames and a child-then-parent ordering produced `relation "<parent>" does not exist` at `diesel migration run`.
- **Generated entity DTOs and services correctly handle audit-field collisions.** Same root cause as the SQL migration fix, applied to all eight Rust template sites (`_entityFileName_dto.rs.ejs`, `_entityFileName_.rs.ejs`, `_entityFileName_mongodb.rs.ejs`, `_entityFileName_service.rs.ejs`, `_entityFileName_service_mongodb.rs.ejs`, plus 3 constructor sites). BigDecimal fields now also get correct utoipa `#[schema(value_type = String)]` annotations and skip `#[validate(range(...))]` (which has trait bounds that BigDecimal doesn't satisfy).
- **`cargo clippy --release --all-targets -- -D warnings`** is now clean across every generated scaffold variant tested in CI (`sample`, `gateway-cb`, `microservice-cb`). Was previously surfacing `items_after_test_module`, `manual_contains`, `unreachable_pattern`, and `await_holding_lock` lint violations in generated code.

### Documentation

- New [`samples.yml` coverage gate comment block](.github/workflows/samples.yml) documents the gate's threshold history and ratchet path so future maintainers see the baseline and trajectory at the gate config site.

### Backward compatibility

Non-breaking. The five scaffold dimensions (`--application-type`, `--db`, `--auth`, `--service-discovery-type`, frontend) accept the same values. Existing v0.9.9-generated apps are untouched on disk; regenerating to v1.0.0 adds the new test modules under `server/src/**/*.rs` and a new `.tarpaulin.toml` at the workspace root — both safe additions that don't alter any pre-existing file shape. The major version bump signals first stable release / coverage commitment, not breaking change.

### Deferred to v1.0.1

- Phase 2b — `handlers/account.rs` error-path tests via `axum-test`
- Phase 2c — `services/resilient_http_client.rs` with `wiremock`
- Phase 3 — `services/consul_service.rs`, `services/vault_service.rs`, `config/config_watcher.rs`, `config/tracing_config.rs` (need external-service mocks and tempfile dance; deferred from v1.0.0 scope)
- Track 1-a — end-to-end integration matrix (separate `e2e.yml` workflow, 7 representative scaffolds, docker-compose + Cypress + tarpaulin per scaffold)

CI gate ratchets to 60 once Phase 2b+2c land; to 70 once Phase 3 lands in v1.0.1.

## [0.9.9] — 2026-05-06

DX patch release. Two critical fixes (microservice scaffolds couldn't compile under `cargo check` since v0.9.4; the new cheat sheet falsely advertised `--db` and `--auth` as flags that work with `--defaults`) plus seven quality-of-life improvements. All non-breaking; nothing in `0.9.8`-generated projects changes until you regenerate.

### Fixed

- **Microservice and gateway scaffolds now compile under `cargo check` on the first run.** `server/Cargo.toml.ejs` was missing a `reqwest.workspace = true` block under the `circuitBreakerEnabled` conditional, so `resilient_http_client.rs` (which uses `reqwest::Client/Response/Error`) failed to compile with three E0432/E0433 errors. The workspace `Cargo.toml.ejs` correctly declared `reqwest`; only the server crate was missing it. Latent since v0.9.4 because vitest's snapshot tests verify file content but never run `cargo check`. Affected every microservice or gateway scaffold with circuit breaker enabled (the default for both) and neither OAuth2 nor Consul. (commit `8774291`)
- Generated `README.md` no longer duplicates content 8 times. The `.jhi.rust.ejs` extension hooked JHipster's fragment-merge mechanism without fragment guards, inserting the template at every fragment slot in the parent README. Renamed to `README.md.ejs` (standalone override). 1001 → 138 lines for a default microservice scaffold. (commit `afcaedf`)
- Generated `.env.example` now ships alongside `.env` so the README's first setup step works. The example uses a known-default sentinel for `JWT_SECRET`, ensuring `cp .env.example .env && cargo run` FATALs at startup rather than silently signing tokens with a placeholder. The header now also names all three failure modes explicitly: JWT scaffolds FATAL on startup, OAuth2 scaffolds fail at first login (OIDC_CLIENT_SECRET placeholder), SQL/MongoDB scaffolds fail at DB connect (placeholder credentials). (commits `44364f6`, `69f5af2`)
- `jhipster-rust --version` and other CLI invocations no longer print `INFO! No custom commands found within blueprint` from the upstream loader. Added `cli/commands.js` exporting an empty default object to satisfy `_getBlueprintCommands`'s probe. Script-friendly: `jhipster-rust --version | awk '{print $1}'` returns `0.9.9` (was `INFO!`). (commit `ed6e945`)
- Generated `README.md` setup section is shorter and accurate: removed the redundant `mkdir -p target/db` step (runtime auto-creates via `fs::create_dir_all`) and the `diesel migration run` step (already auto-run in the generator's END phase). The diesel command stays as a note for the entity-addition workflow. Two steps now: review `.env`, then `cargo run`. (commit `69f5af2`)
- Generated `README.md` server-URL line is now conditional on application type. Previously hard-coded `http://localhost:8080` regardless, which was wrong for every microservice scaffold (those use port 8081 per `env.ejs`). (commit `69f5af2`)

### Changed

- `jhipster-rust app --help` now prints a Rust Blueprint quick reference between the Rust badge and JHipster's full Options block. Enumerates supported choices for the four scaffold-shaping flags (`--application-type monolith | gateway | microservice`, `--db sqlite | postgresql | mysql | mongodb`, `--auth jwt | oauth2`, `--service-discovery-type consul | no` — the choice lists reflect what this blueprint implements, not what JHipster core advertises), with three example invocations. (commits `fd43639`, `69f5af2`)
- The cheat sheet is honest about the `--defaults` interaction: `--db` and `--auth` are silently overridden by `--defaults` (a pre-existing JHipster CLI behavior — those flags only take full effect with `--skip-server`). The cheat sheet now annotates them as `(interactive only)` and includes an explicit Note: to pick a non-default DB or auth, omit `--defaults` and answer the prompts. (commit `b2323e8`)
- Source `README.md` gains a `# What This Does in 60 Seconds` section above `# Introduction`, so a developer landing from a Google search hits the magical-moment pitch (copy-paste commands plus a dense outcome paragraph naming all three app types and frontend choices) before the feature matrix. The pitch's prose qualifies that the JHipster frontend ships with monolith and gateway only (microservice mode is API-only); timing claims explicitly distinguish cold versus warm cargo cache. (commits `c05a50a`, `69f5af2`)

### Documentation

- New `CHANGELOG.md` at repo root indexes every release from `0.7.4` through `0.9.9`, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Each version is dated from its git tag and grouped into Added / Changed / Fixed / Breaking / Migration as applicable. Long-form per-release narrative stays in `RELEASE_NOTES.md`. (commit `a8004d8`)
- Three-line shell comment added above the `[ -z ]` test in `docker-entrypoint.sh.ejs` documenting the deliberate empty-vs-unset convergence (POSIX `[ -z ]` matches both empty and unset, so `JWT_SECRET=""` generates a random value here just like missing) and pointing at the Rust binary's `is_sentinel("")` as the layer that catches the bare `cargo run` path. (commit `551c235`)

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

[0.9.9]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.9
[0.9.8]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.8
[0.9.7]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.7
[0.9.6]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.6
[0.9.5]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.5
[0.9.4]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.9.4
[0.8.0]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.8.0
[0.7.8]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.7.8
[0.7.4]: https://github.com/pandeyn/generator-jhipster-rust/releases/tag/v0.7.4
