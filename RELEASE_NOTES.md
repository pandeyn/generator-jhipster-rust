# Release Notes - v1.0.0

## Overview

We made it to v1.0.0. The major version bump isn't about breaking things — it's about putting a stake in the ground. Every PR from this release forward runs `cargo tarpaulin` against the canonical scaffold and fails if overall coverage drops below 50%. The threshold ratchets up each release; the floor itself is what we're promising not to walk back.

If you've been generating microservices or gateways since v0.9.4 and quietly wondering why `cargo check` failed on the first run after adding an entity, this release is also for you. Five categories of latent template bugs that have been shipping for the better part of a year are now fixed. Vitest snapshot tests are happy to verify file content, but they never invoke `cargo` — so the bugs slipped through every release until we added CI that actually compiles what comes out of the generator.

The API surface and the five scaffold flags work exactly the same as in v0.9.9. The major bump is a stability commitment, not a breaking change.

## Coverage trajectory

Here's how the coverage numbers moved over the seven PRs that landed between 2026-05-10 and 2026-05-11, measured against the canonical `microservice-cb` scaffold (Postgres + JWT + Consul + Circuit Breaker — the most production-realistic shape we test):

| Milestone                                           | Coverage               | Δ from prior           |
| --------------------------------------------------- | ---------------------- | ---------------------- |
| v0.9.9 baseline (2026-05-10)                        | 35.67% (631/1769)      | —                      |
| Phase 0 (`.tarpaulin.toml` adds main.rs exclusion)  | 46.54% (881/1893)      | denominator correction |
| Phase 1a — DTO deserializers                        | 50.18% (951/1895)      | +3.64pp                |
| Phase 1b — config `from_env` parsing                | 52.77% (1000/1895)     | +2.59pp                |
| Phase 1c — handler routes                           | 54.56% (1034/1895)     | +1.79pp                |
| Phase 1d — middleware + errors + openapi            | 56.52% (1071/1895)     | +1.96pp                |
| Phase 2a — user_service sort branches + error paths | **60.11%** (1139/1895) | +3.59pp                |

Eleven Tier 1 files hit 90% or better (nine of them at 100%); Tier 2's `user_service.rs` landed at 80.6%. Two Tier 1 files (`dto/common.rs` at 85%, `dto/pagination.rs` at 89%) came in just under the 90% target — the remaining uncovered lines are deep inside cascading `if let Ok(...)` datetime parsers, where cracking them means asserting against which serde visitor method handles which input shape. That's a tradeoff between coverage % and test-against-implementation-detail. We took the win and queued the polish pass for v1.0.1.

## What's new in v1.0.0

### The coverage gate

`.github/workflows/samples.yml` gained a new `Coverage Gate (canonical scaffold)` job. It runs after the matrix samples (`sample`, `gateway-cb`, `microservice-cb`) finish, downloads the `microservice-cb` scaffold as a workflow artifact (saves about two minutes per run by not regenerating from scratch), spins up a `postgres:16` service container, installs `cargo-tarpaulin ^0.31` and `diesel_cli ^2.3`, applies the diesel migrations, and runs `cargo tarpaulin --fail-under 50 -- --test-threads=1`. If overall coverage drops below 50%, the PR fails at this step. That's the commitment.

About `--test-threads=1`: the canonical scaffold's existing integration tests (`handlers::user`, `services::auth_service`, `services::user_service`) hard-code user IDs and reuse fixed test logins, so parallel execution against the shared `oldie_k8_pg_test` DB produced spurious "User 2 not found" and "duplicate key" failures. Fixing per-test isolation — transactional rollback or unique-login generation — is real work that we've queued beyond v1.0.0. Serializing test execution is the unglamorous-but-effective workaround for now.

The threshold ratchets per release. v1.0.0 holds it at 50. Once Phase 2b and 2c land in v1.0.1, it bumps to 60. Phase 3 in v1.0.1 takes it to 70.

### About 150 new tests in the generated scaffold

All the test code lives in the EJS templates under `generators/rust-server/templates/server/src/**/*.rs.ejs`, so every scaffold you generate — regardless of which combination of flags you pass — ships with the same coverage shape. Here's the breakdown:

- **DTO deserializers** (`dto/common.rs.ejs`, `dto/pagination.rs.ejs`) cover the React-vs-Angular `{"id": "1"}` vs `{"id": 1}` asymmetry that's been documented inline since v0.9.0 but never asserted in tests; the five datetime format variants (RFC 3339, Z-suffix with and without fraction, naive with and without fraction, space-separated); the `QsQuery` axum extractor; the `preprocess_duplicate_keys` query-string transform that translates `sort=a&sort=b` into the array form serde_qs needs; the `SortVisitor`; and the `QsQueryRejection` IntoResponse impl.
- **Config `from_env` constructors** (`config/app_config.rs.ejs`, `config/vault_config.rs.ejs`, `config/consul_config.rs.ejs`, `config/metrics_config.rs.ejs`) cover defaults, explicit overrides, the boolean-truthiness contracts (`"true"`/`"TRUE"`/`"1"` accepted; anything else disables), env-wins-over-consul precedence in `from_consul_and_env`, and every conditional EJS branch (JWT, OAuth2, MongoDB, static hosting). All four files at 100% coverage after Phase 1b.
- **Handler routes** (`handlers/health.rs.ejs`, `handlers/management.rs.ejs`) cover `GET /health`, `/liveness`, `/readiness`. They pin the Spring Boot Actuator `"UP"`/`"DOWN"` body shapes that K8s probes and JHipster clients key on — these aren't arbitrary strings, they're contract. `GET /management/info` covers `APP_PROFILE` env override, `production` → `prod` and `development` → `dev` normalization, the swagger-codegen `api-docs` profile contract, and the always-`"dev"` ribbon contract.
- **JWT auth middleware** (`middleware/auth.rs.ejs`) exercises `auth_middleware` end-to-end: no Authorization header gives you anonymous, valid Bearer populates the user, expired returns 401, invalid returns 401, a non-Bearer Authorization header falls through to anonymous. Plus `require_auth` (rejects anonymous, accepts authenticated) and `require_role` (rejects user without role, accepts user with role, rejects anonymous).
- **Error response mapping** (`errors/app_error.rs.ejs`) — for each of the seven `AppError` variants, the test asserts the status code, body shape, and message. The `Internal` variant gets special attention: we pin the contract that the original (potentially sensitive) error message must never appear in the response body, only in the server-side `tracing::error` log. Plus four diesel conversion tests covering `UniqueViolation` → `Conflict`, `ForeignKeyViolation` → `BadRequest`, other DB-error kinds → `Internal`, and a non-DB diesel-error catch-all.
- **OpenAPI registry** (`openapi.rs.ejs`) — asserts `ApiDoc::openapi()` registers a known path, the `SecurityAddon` modifier adds the `bearer_auth` scheme as a side effect, info metadata is populated.
- **User service sort branches** (`services/user_service.rs.ejs`) — 17 parametrized `rstest` cases cover the 8-way sort match in `find_all`. Each of `login`, `email`, `firstName`, `lastName`, `langKey`, `activated`, `createdDate`, `lastModifiedDate` × ascending and descending, plus the default-unknown-field fallthrough to id ASC. Plus six error-path and idempotent-contract tests that pin the actual behavior: `update` returns NotFound for nonexistent id; `delete` is idempotent (Ok(()) on zero rows); `update_password` is idempotent; `find_by_login` and `find_by_email` return specific NotFound variants; `get_authorities` returns Ok(empty_vec) for a nonexistent user_id rather than NotFound. The idempotent contracts are easy to misremember and the tests pin them so a future "make these strict" refactor produces an explicit test failure rather than a silent behavior change.

### Test isolation conventions that future PRs will reuse

Three patterns crystallized across Phase 1, and they're worth knowing if you're contributing tests of your own.

**Module-local Mutex for env-var-touching tests.** A `static ENV_LOCK: Mutex<()> = Mutex::new(())` at module top serializes tests within that module while leaving the rest of the suite parallel. Each module has its own lock — different config modules don't block one another. For sync tests, `std::sync::Mutex` is fine. For `#[tokio::test]` cases that hold the lock across `.await` (e.g., an HTTP request), use `tokio::sync::Mutex::const_new(())` instead — the std Mutex would trip clippy's `await_holding_lock` lint because it can block a tokio worker thread.

**`#[cfg_attr(test, derive(serde::Deserialize))]` on response DTOs.** Lets tests parse responses into typed structs without adding `Deserialize` to the production binary. Compile-time gated, zero runtime cost. Use it when you want typed access in tests but the DTO is a one-way `Serialize`-only type in production.

**`rstest = "0.21"` for parametrized cases.** When you'd otherwise write a series of near-identical test functions that differ only in a parameter, use `rstest`'s `#[case]` annotations to compress them into one. The 17-case sort test in `user_service` is the canonical example; future parametrized tests should follow the same pattern.

### Five template compilation bugs fixed

These have been shipping since v0.9.4. We caught them only after wiring up Samples CI to actually run `cargo check` against the generated scaffolds.

**Audit-column duplication.** If your JDL declared an entity with `createdDate`, `createdBy`, `lastModifiedDate`, or `lastModifiedBy` as an explicit field, the generator would emit the column twice — once via the JDL field iteration, once via an unconditional audit-column block. Eight Rust template sites and the SQL migration template were affected. Every audit-column site is now gated on `!fields.some(f => f.fieldName === '<jdlName>')`.

**`schema.rs` shipped empty.** Every entity scaffold failed `cargo check` with `crate::db::schema::<entity>` unresolved. The fix is a new `addEntityToRustSchema` source helper that emits `diesel::table!` blocks (id, JDL fields, FK columns, audit columns gated identically) at a needle marker in `schema.rs.ejs`. Plus `addJoinTableToRustSchema` for many-to-many relationships.

**`bigdecimal` crate referenced but not declared.** Entity templates emit `bigdecimal::BigDecimal` when a JDL field is typed `BigDecimal`, but neither the workspace nor server `Cargo.toml.ejs` declared the dependency. The fix adds `bigdecimal = { version = "0.4", features = ["serde"] }` and `, "numeric"` to diesel features when `hasBigDecimalFields` is true. We also addressed the trait-bound cascade: BigDecimal doesn't implement `validate::ValidateRange` (so we skip `#[validate(range(...))]` for those fields) or utoipa's `ToSchema` directly (so we add `#[schema(value_type = String)]` annotations).

**Entity migration FK ordering.** Diesel applies migrations in lexicographic timestamp order. If your JDL declared `Product` before `Category` and `Product` had a many-to-one relationship to `Category`, both migrations got timestamped from each entity's `changelogDate` — Product's earlier date sorted first, then `diesel migration run` tried to FK-reference a non-existent category table. The fix is a topological sort: when an entity has an unresolved FK dependency, its migration timestamp gets bumped to one second after its latest dependency's. The original `changelogDate` is preserved when it already sorts after dependencies, so regeneration-stable filenames are maintained.

**MongoDB entity template completed.** The MongoDB variant had 30 individually-gated audit-field references in its struct definitions and constructor sites that were inconsistent with the SQL variant. They all match the same `!fields.some(...)` pattern now.

### Samples CI workflow itself fixed

The Samples workflow that caught all the bugs above had been silently red since v0.9.4 (the day it was added). Reason: `npx --yes yo jhipster-rust:generate-sample` couldn't resolve `generator-jhipster-rust` from `node_modules`. `npx` only installs `yo` itself, and Yeoman then looks for the generator via `require.resolve`. `npm ci` doesn't create a self-link to the package under development, so the resolve fails. Fix: invoke the local CLI directly.

```yaml
- name: Generate sample application
  run: |
    mkdir -p app
    cd app
    node "$GITHUB_WORKSPACE/cli/cli.cjs" generate-sample ${{ matrix.sample }} --skip-install --skip-git
```

`cli/cli.cjs` computes `devBlueprintPath` from its own `__dirname`, so it finds `.blueprint/generate-sample/` regardless of cwd. This tests the LOCAL checkout — correct for PR-time CI — not whatever's published to npm. The fix landed in PR #8 (the rolled-up `v1.0.0-ci-fix` branch) alongside the five template bugs.

## Upgrade Notes

### Backward compatibility

Existing v0.9.9-generated apps are untouched on disk. The generator runs at scaffold time, so v1.0.0 only affects projects you regenerate with it.

### What changes when you regenerate to v1.0.0

You get new test modules under `server/src/**/*.rs` — every file the coverage work touched ships with its tests included. The generated `server/Cargo.toml` declares `rstest = "0.21"` and `axum-test = "14"` as dev-dependencies. Your production binary is unchanged; both are gated `[dev-dependencies]` and don't make it into release builds.

There's a new `.tarpaulin.toml` at the workspace root excluding `server/src/main.rs` from coverage measurement. Runtime behavior is unchanged; the file only affects what `cargo tarpaulin` reports.

And if you regenerate a microservice or gateway with JDL-declared entities, the scaffold now actually compiles under `cargo check` on first run. Audit-column duplication, schema.rs gaps, BigDecimal declarations, FK-ordered migrations — all five categories of pre-existing template bugs are addressed.

### What changes for blueprint contributors

Samples CI is now meaningful. Every PR runs `cargo check`, `cargo clippy --release --all-targets -- -D warnings`, and `shellcheck docker-entrypoint.sh` against three scaffolds (`sample`, `gateway-cb`, `microservice-cb`). The Coverage Gate is the fourth check, and it's the one with the durable commitment.

If you're adding tests to the templates, the three conventions above (`Mutex` for env vars, `cfg_attr` for response DTOs, `rstest` for parametrized cases) are the patterns to follow. Phase 2b, 2c, and 3 PRs will reuse them.

### What stays exactly the same

All five scaffold dimensions (application type, frontend, database, auth, service discovery) accept the same values. The existing vitest snapshot test infrastructure passes 440/440. Every v0.9.8 security release behavior is unchanged: `docker-entrypoint.sh` still WARNs on unset `JWT_SECRET`, FATALs on the four sentinel forms, INFOs on operator-supplied. K8s and Helm sentinel handling is unchanged.

### Recommended action for existing users

Regenerate over your existing scaffold with `jhipster-rust --force` and run `cargo check` followed by `cargo test`. If you have a microservice or gateway with entities, the regeneration is more than just absorbing new tests — five categories of pre-existing template bugs go away. If you've been working around them, you can stop.

## Deferred to v1.0.1

The original v1.0.0 plan included more: Phase 2b (`handlers/account.rs` error paths via `axum-test`), Phase 2c (`services/resilient_http_client.rs` with `wiremock`), Phase 3 (consul/vault/config_watcher/tracing coverage), and Track 1-a (end-to-end integration matrix with docker-compose + Cypress + tarpaulin across 7 representative scaffolds). After Phase 2a landed and overall coverage hit 60.11%, we decided to ship rather than keep adding scope. v1.0.0 has the coverage commitment and the template fixes that have been bleeding into user-facing bugs for half a year. The remaining items are queued for v1.0.1, and the CI gate ratchets to 60 when Phase 2b+2c land and to 70 when Phase 3 lands.

---

# Release Notes - v0.9.9

## Overview

JHipster Rust Blueprint v0.9.9 is a **DX patch release** that fixes issues in the developer experience of `generator-jhipster-rust` itself. Two of the fixes are critical: the canonical microservice scaffold has been failing `cargo check` since v0.9.4 because `server/Cargo.toml` was missing a `reqwest` dependency under the circuit-breaker conditional.

This release is fully **non-breaking**. Existing 0.9.8-generated apps are untouched on disk; users who regenerate to 0.9.9 get a clean README, a working `.env.example`, a quiet CLI, and a server crate that compiles on the first `cargo check` for microservice and gateway scaffolds.

## What's New in v0.9.9

### Generated `README.md` no longer duplicates content 8x

The old `README.md.jhi.rust.ejs` filename hooked JHipster's fragment-merge mechanism. With no fragment guards in our template, the merge engine inserted the full template once per fragment slot in the parent `init` generator's `README.md.ejs`, producing 8 copies of every section in a 1001-line, 25.8KB generated README. Renamed to `README.md.ejs` (drops the `.jhi.rust` segment) so the blueprint writes the file directly as a standalone override. Default microservice scaffold is now 138 lines, single occurrence of every heading. (commit `afcaedf`)

### Generated `.env.example` ships alongside `.env`

The generated README's setup step 1 said verbatim `cp .env.example .env`, but the generator only emitted `.env`, so the very first instruction failed. Added `generators/rust-server/templates/env.example.ejs` mirroring the conditional structure of `env.ejs` (microservice/monolith, sqlite/postgres/mysql/mongo, jwt/oauth2, optional consul/vault/email/kafka/tracing/circuit-breaker). The example uses `JWT_SECRET=change-me-in-production` — a value already in the entrypoint and Rust binary's sentinel denylist — so `cp .env.example .env && cargo run` against an unmodified scaffold is guaranteed to FATAL at startup rather than silently signing tokens with a placeholder. The header now also names all three failure modes explicitly: JWT scaffolds FATAL on startup, OAuth2 scaffolds fail at first login (OIDC_CLIENT_SECRET placeholder), SQL/MongoDB scaffolds fail at DB connect (placeholder credentials). (commits `44364f6`, `69f5af2`)

### `jhipster-rust --version` and other CLI invocations are quiet

Upstream `generator-jhipster`'s `_getBlueprintCommands` probes every loaded blueprint for `<blueprint>/cli/commands.{js,cjs,mjs,ts,cts,mts}` and prints `INFO! No custom commands found within blueprint: <path>` via `console.info` on every CLI invocation when missing. The line polluted `--version` output and broke any pipeline consuming stdout: `jhipster-rust --version | awk '{print $1}'` returned `INFO!` instead of `0.9.8`. Added `cli/commands.js` exporting an empty default object to satisfy the loader. The `package.json` `files` array already includes `cli/`, so the new module ships in the npm tarball without further config changes. (commit `ed6e945`)

### New Rust Blueprint quick reference on `jhipster-rust app --help`

The default `app --help` rendered ~50 inherited JHipster core flags, with the four flags that actually shape a Rust scaffold (`--application-type`, `--db`, `--auth`, `--service-discovery-type`) buried mid-list, and `--db` not enumerating its choices because the upstream schema doesn't declare them. Extended the existing `printBlueprintLogo` callback in `cli/cli.cjs` to print a Rust-specific cheat sheet between the Rust badge and JHipster's full Options block when argv contains `app --help` or `-h`. The cheat sheet enumerates supported choices for all four flags (`--auth jwt | oauth2`, `--service-discovery-type consul | no` — only what this blueprint actually implements, not what JHipster core advertises), lists three common workflow flags, and shows three example invocations.

The cheat sheet also includes an explicit Note: `--db` and `--auth` are silently overridden by `--defaults` (the built-in defaults sqlite + jwt always win — a pre-existing JHipster CLI behavior). To pick a different DB or auth, omit `--defaults` and answer the prompts interactively. The cheat sheet is gated on `args[0] === 'app'` so `--version`, top-level `--help`, and `entity --help` are unaffected. (commits `fd43639`, `b2323e8`, `69f5af2`)

### `server/Cargo.toml.ejs` declares `reqwest` when circuit breaker is enabled (CRITICAL)

This is a **latent compilation bug** that has been shipping since v0.9.4 (2026-03-27, when the circuit breaker was introduced). The workspace `Cargo.toml.ejs` correctly declares `reqwest` under the `circuitBreakerEnabled` conditional, and `resilient_http_client.rs` (always generated when CB is enabled) uses `reqwest::Client`, `reqwest::Response`, `reqwest::Error`. But `server/Cargo.toml.ejs` was missing the corresponding `reqwest.workspace = true` block — so the server crate never pulled `reqwest` into its dependency graph, and `cargo check` failed with three E0432/E0433 errors at `use reqwest::*` lines.

Affected scaffolds: every microservice or gateway scaffold with circuit breaker enabled (the default for both app types) where neither OAuth2 nor Consul service discovery was also enabled. The blueprint's vitest snapshot tests verify file content but never run `cargo check` on the generated project, so the bug shipped through v0.9.4, v0.9.5, v0.9.6, v0.9.7, and v0.9.8 silently.

Fixed by adding a 3-line conditional in `server/Cargo.toml.ejs` that adds `reqwest.workspace = true` when `circuitBreakerEnabled && !authenticationTypeOauth2 && !serviceDiscoveryConsul`, mirroring the existing consul dedup pattern. The original author's intent was visible in the existing zipkin block at line 84, which conditionalizes `!circuitBreakerEnabled` — implying CB was supposed to add reqwest somewhere. This fix realizes that intent. Verified: `cargo check` exits 0 in 12 seconds on the canonical microservice scaffold; monolith scaffolds (CB off by default) correctly do not have `reqwest` added. (commit `8774291`)

### New top-level `CHANGELOG.md`

`RELEASE_NOTES.md` has grown to 1069 lines of long-form per-release narrative — rationale, root-cause analysis, migration commands. The right shape for deciding how to migrate, the wrong shape for scanning "should I upgrade and what breaks if I do." Added a top-level `CHANGELOG.md` (now ~210 lines) following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) that indexes every release from `0.7.4` through `0.9.9`. Each version is dated from its git tag and grouped into Added / Changed / Fixed / Breaking / Migration as applicable. The 0.9.8 section gets the most detail because operator-visible changes need it; 0.9.7 has an explicit Breaking section because JHipster 9 forces regeneration. `RELEASE_NOTES.md` stays the long-form source. (commit `a8004d8`)

### Source `README.md` first-impression pitch

A developer landing on the README from a Google search used to hit the 30-row Implemented Features matrix before any value pitch. Added a `# What This Does in 60 Seconds` section between the title/badges and the existing `# Introduction`, so the wow appears above the matrix. The pitch is action-first: copy-paste-runnable command block (microservice + sqlite + jwt + `--defaults`), then a single dense paragraph naming what comes out (Axum + JWT + Diesel + OpenAPI + Docker + K8s + Helm + frontend choices), with measured numbers (`~30 seconds to scaffold; 2-5 minutes for the first cold cargo build, sub-second incrementally`) and the `localhost:8081` URL the developer hits.

The pitch's prose qualifies that the JHipster frontend is monolith-only / gateway-only (microservice mode is API-only), and the timing numbers explicitly distinguish cold versus warm cargo cache so first-time users on cold cache aren't confused by a 5-minute compile. (commits `c05a50a`, `69f5af2`)

### Generated README's setup section is shorter and accurate

The previous SQLite setup section had four steps: copy `.env.example` (broken instruction, fixed above), `mkdir -p target/db`, `diesel migration run`, then `cargo run`. Steps 2 and 3 were redundant: the runtime auto-creates the SQLite directory via `fs::create_dir_all(parent)` in `connection.rs:226`, and the generator already runs `diesel migration run` in its END phase. Collapsed to two steps (review `.env`, then `cargo run`) with the diesel command preserved as a note for the entity-addition workflow. Source README pitch and generated README setup section now agree: the first run needs nothing beyond `cargo run`. (commit `69f5af2`)

### Server URL in generated README is conditional on application type

The generated README hard-coded `The server will start at http://localhost:8080` regardless of application type. Microservice scaffolds use `APP_PORT=8081` per `env.ejs`, so this URL was wrong for every microservice scaffold the blueprint had ever produced. Wrapped the line in an `applicationTypeMicroservice` conditional matching the pattern used in `env.ejs:7-11`. (commit `69f5af2`)

### `docker-entrypoint.sh` documents the empty-vs-unset convergence

The shell `[ -z "${JWT_SECRET:-}" ]` test treats empty and unset identically (POSIX semantics) and generates a random per-container value for both. The Rust binary's `is_sentinel("")` independently rejects empty for the bare `cargo run` path that bypasses the entrypoint entirely. Added a 3-line shell comment above the test naming the deliberate convergence and pointing at the Rust check as the layer that catches the cargo run path. Future maintainers no longer need to grep for `is_sentinel` to understand why empty `JWT_SECRET` is allowed to generate. shellcheck still passes clean on the generated entrypoint. (commit `551c235`)

## Upgrade Notes

### Backward compatibility

Existing 0.9.8-generated apps are untouched on disk. The generator runs at scaffold time, so v0.9.9 only affects projects you regenerate with it.

### What changes when you regenerate to 0.9.9

- Generated `README.md` is now 138 lines (was 1001) for a default microservice scaffold. Single `# <baseName>` heading, single `## Development` heading, no duplication.
- A new `.env.example` file is generated alongside `.env`. The setup section in the generated README now points users at `.env` directly (with `.env.example` documented as the sanitized template for committing to git).
- The generated server crate's `Cargo.toml` now declares `reqwest.workspace = true` when circuit breaker is enabled — this is the fix that makes microservice and gateway scaffolds compile under `cargo check` for the first time since v0.9.4.

### What changes when you run `jhipster-rust`

- `jhipster-rust --version` no longer prints the leading `INFO!` line. Output is exactly `0.9.9 (generator-jhipster 9.0.0)`.
- `jhipster-rust app --help` now prints a Rust Blueprint quick reference between the Rust badge and JHipster's full Options block. All other commands (`--version`, top-level `--help`, `entity --help`) are unchanged.

### What stays exactly the same

- The 0.9.8 security release behaviors are unchanged: `docker-entrypoint.sh` still WARNs on unset `JWT_SECRET`, FATALs on the four sentinel forms, and INFOs on operator-supplied. The Rust binary's sentinel rejection is unchanged. K8s and Helm sentinel handling is unchanged.
- All five scaffold dimensions (application type, frontend, database, auth, service discovery) accept the same values.
- Existing snapshot test infrastructure passes 440/440.

### Recommended action for existing users

If you have a v0.9.8-generated microservice or gateway that didn't compile under `cargo check`, this release fixes it. Regenerate with `jhipster-rust --force` and run `cargo check` to verify. If you have an existing `.env` with a real `JWT_SECRET`, regeneration won't overwrite it (the generator preserves existing files unless `--force` is used).

---

# Release Notes - v0.9.8

## Overview

JHipster Rust Blueprint v0.9.8 is a **security-focused release** that hardens the templates the blueprint emits. An audit conducted before this release identified 14 issues spanning authentication defaults, container privilege, K8s secret handling, CORS configuration, and CI supply-chain. This release closes these issues without forcing existing 0.9.7 deployments to change their workflow.

The spine of the release is a runtime entrypoint script (`docker-entrypoint.sh`) that generates a random per-container `JWT_SECRET` when the operator hasn't supplied one, and refuses to start when the value matches a known-default sentinel string. A Rust startup-time check duplicates the sentinel rejection so the K8s static-manifest path (where `envFrom: secretRef` injects the value before the entrypoint sees it) is also covered. The denylist covers three legacy default forms (the bare `change-me-in-production`, the longer `change-me-in-production-use-a-secure-random-string`, and `your-super-secret-jwt-key-change-in-production`), a wildcard for the older timestamp-based pattern, and the empty string (a zero-byte HMAC key signs forgable tokens). The same denylist is enforced by the docker vault-init script before any value is written to Vault, so dev/test stacks can't seed a publicly-known signing key either. `server/src/config/sentinels.rs` is the single source of truth shared by the Rust binary; the shell scripts mirror it line-for-line.

OAuth2 deployments get proper CSRF state validation — the state parameter is now generated from `OsRng`, stored in an HttpOnly cookie before redirect, and constant-time compared on the callback (`subtle::ConstantTimeEq`). Token cookies gain a `Secure` flag when the app serves over HTTPS. CORS becomes environment-aware: development keeps the permissive default so local frontends work without operator config, but production reads `CORS_ALLOWED_ORIGINS` from the environment and refuses to start when that variable is missing or empty. Containers run as a non-root user (UID 1001) in both Dockerfile and K8s deployment manifests; non-SQLite paths add a writable `/tmp` `emptyDir` so `readOnlyRootFilesystem: true` doesn't crash the app on first temp-file write.

CI and dependency hygiene round out the release. Third-party actions in `.github/workflows/samples.yml` are pinned to commit SHAs, a new `.github/dependabot.yml` keeps them current, and a `shellcheck` step lints the generated entrypoint on every sample-matrix run. `npm audit` reports zero vulnerabilities — down from 24 — via a combination of `npm audit fix`, npm overrides on transitive packages, and an eslint bump.

Generation across SQLite/PostgreSQL/MySQL/MongoDB and the existing JHipster sample shapes (basic monolith, microservice with circuit breaker, gateway with circuit breaker) was regression-tested end to end. The full vitest suite passes (440 generator specs across rust-server, kubernetes, helm, docker, cypress, and client) and a new spec (`generators/rust-server/entrypoint.spec.js`, 7 cases) exercises the entrypoint behavior matrix directly. End-to-end deployment was verified on a local kind cluster: `helm install` brings the app and its postgres StatefulSet to Ready in roughly 17 seconds with no operator-supplied secrets, the JWT auth roundtrip succeeds, and forged tokens return 401.

## What's New in v0.9.8

### JWT_SECRET handling

Three coordinated fixes replace the prior single point of failure.

**Scaffold-time default.** `env.ejs` previously emitted `JWT_SECRET=<baseName>-jwt-secret-key-change-in-production-<timestamp>`. The timestamp made the value brute-forceable for anyone who knew approximately when the project was scaffolded. v0.9.8 calls `crypto.randomBytes(32).toString('hex')` from `node:crypto` at scaffold time, producing a unique 64-character hex value per generation. The field that drives this is `application.jwtSecretDefault`, set in `generators/rust-server/generator.js` during the PREPARING priority.

**Runtime default.** The Dockerfile no longer sets `ENV JWT_SECRET=...`. A new `docker-entrypoint.sh.ejs` template ships an entrypoint script that:

1. Generates a 32-byte CSPRNG hex value via `head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'` when `JWT_SECRET` is unset, exporting it for the child process. Logs `WARNING: JWT_SECRET unset; generated random per-container value.`
2. Refuses to start (exit 1, `FATAL` log) when `JWT_SECRET` matches a known-default sentinel string. Three exact matches and one wildcard pattern are checked.
3. Logs `INFO: JWT_SECRET supplied by operator.` for any other value.

Then `exec "$@"` hands off to the configured CMD. The script is POSIX `sh`, depends on no extra packages, lints clean under `shellcheck`, and runs in CI on every sample-matrix run.

**Defense-in-depth check in the Rust binary.** A new module `server/src/config/sentinels.rs` exports `is_sentinel(&str) -> bool`. `main.rs` calls it after `AppConfig::from_env()` and before `axum::serve`, exiting with a `FATAL` log if the value matches. This catches the K8s static-manifest path: when `envFrom: secretRef` injects the JWT_SECRET from an unmodified `app-secret.yml` (which used to ship the literal `your-super-secret-jwt-key-change-in-production`), the entrypoint sees the variable as "set" and would otherwise pass the value through. The Rust check sees the same sentinel and blocks startup.

### OAuth2 CSRF state validation

Previously the OAuth2 `state` parameter was a hex-formatted timestamp from `SystemTime::now().as_nanos()`, and the `callback()` handler never validated it. v0.9.8 fixes both: `generate_random_state()` now reads 32 bytes from `OsRng` and hex-encodes them inline. The `authorize()` handler stores the value in an `HttpOnly` (and `Secure` when `app_https`) cookie via a hand-rolled `Response::builder()` (`Redirect::temporary` doesn't compose with cookies cleanly). On the callback, `extract_cookie(&headers, "oauth_state")` reads the stored value and `subtle::ConstantTimeEq::ct_eq` compares it to `params.state`. Missing cookie, missing query param, and mismatched values all return a 400-ish error redirect to the frontend. The cookie is cleared on the success path with the same Path/Secure attributes so browsers invalidate it cleanly.

### Cookie hardening (Secure flag)

Access-token and id-token cookies now append `; Secure` when `state.config.app_https` is true. The behaviour is gated on `enableStaticHosting` in EJS — microservices without static hosting (which don't have an `app_https` field on `AppConfig`) keep the unchanged behaviour. **`HttpOnly` on these cookies is intentionally deferred** to a future release because adding it requires a frontend SPA refactor (the SPA currently reads the access token via `document.cookie`).

### CORS becomes environment-aware

`main.rs` previously built `CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any)` unconditionally. v0.9.8 splits this on `config.is_production()`:

- **Development** (`APP_ENV=development`, the default): unchanged. `Any` origin, `Any` methods, `Any` headers, so local frontends on arbitrary ports keep working without operator config.
- **Production** (`APP_ENV=production`): reads `CORS_ALLOWED_ORIGINS` from the env (comma-separated). Methods restricted to `GET, POST, PUT, DELETE, OPTIONS`. Headers restricted to `AUTHORIZATION, CONTENT_TYPE`. The app refuses to start with `FATAL: CORS_ALLOWED_ORIGINS must be set in production.` when the variable is absent or empty.

### Container privilege

The Dockerfile's runtime stage now creates a system user with `useradd --system --uid 1001 --no-create-home appuser`, runs `chown -R 1001:1001 /app`, switches to `USER 1001` before `ENTRYPOINT/CMD`. For SQLite the chown is preceded by `mkdir -p /app/target/db` so the default DB directory exists with the right ownership.

The K8s `Deployment` (`generators/kubernetes/templates/k8s/app-deployment.yml.ejs`) gains a `securityContext` block: `runAsNonRoot: true`, `runAsUser: 1001`, `allowPrivilegeEscalation: false`, `capabilities: { drop: [ALL] }`, and `readOnlyRootFilesystem` toggled by DB choice (true for Postgres/MySQL/Mongo, false for SQLite). Non-SQLite deployments add a writable `/tmp` `emptyDir` because Tokio scratch space, Rustls cert caching, and panic dumps all need it.

### K8s secret handling

The static `app-secret.yml.ejs` no longer ships hardcoded plaintext defaults. The rendered manifest has `stringData: {}` and a comment block explaining three operator approaches: edit the file inline, use `kubectl create secret generic ... --from-literal=...`, or use the Helm chart.

The Helm path uses a **lookup-or-generate** template in `templates/secret.yaml` for both `JWT_SECRET` and `DB_PASSWORD`. On first install, no in-cluster Secret exists yet, so `randAlphaNum 32` generates fresh values. On subsequent `helm upgrade` runs, `lookup "v1" "Secret" .Release.Namespace $secretName` returns the existing Secret and the chart reuses the prior values (`b64dec | quote`). This preserves token validity across rolling deployments — without it, every upgrade would rotate the JWT signing key (invalidating every in-flight session) and rotate the database password (locking the app out of its persisted volume). Operators can override either via `helm install --set secrets.JWT_SECRET="$(openssl rand -hex 32)" --set secrets.DB_PASSWORD="$(openssl rand -base64 24)"`. `README-helm.md` documents the rotation procedure.

**K8s/Helm consul-config and vault-init scrub.** Four manifests previously shipped a literal `change-me-in-production` JWT seed — the K8s static `consul-config-configmap.yml`, the Helm chart's `consul-config-configmap.yaml`, and both `vault-init-job` variants. The Rust app's `from_consul_and_env` falls back to Consul KV when env `JWT_SECRET` is unset, so a missed `secretRef` would have silently picked up that publicly-known string. v0.9.8 drops the `jwt.secret` line from both consul ConfigMaps (env JWT_SECRET via Helm secret-pipeline or operator-supplied secretRef stays the source of truth) and drops the JWT_SECRET write from both vault-init Jobs (operators populate Vault post-install or via the Helm Secret). The bare `change-me-in-production` form was also added to the entrypoint and Rust denylists so any future regression is caught at startup.

### Dockerfile DB credentials

The runtime stage previously set `ENV DATABASE_URL=postgres://postgres:postgres@db:5432/...` (and `mysql://root:root@db:3306/...`, and the SQLite/Mongo equivalents). v0.9.8 removes those defaults entirely. The runtime app already calls `env::var("DATABASE_URL").expect(...)`, so the failure mode flips from "silently use bad creds" to "fail loud at startup with operator action required." The `MONGODB_DATABASE` env var (which is just a database name, not a credential) stays as a default since it's app-local.

### DATABASE_URL stays out of the K8s and Helm ConfigMap

Both the K8s static `app-configmap.yml` and the Helm chart's `values.yaml` `config:` block previously shipped `DATABASE_URL` with the literal `postgres:postgres` (or `root:root`) credential — a plaintext password readable by anyone with namespace `get/list` rights on ConfigMaps, and out of sync with the random password the postgres/mysql StatefulSet expected from the Secret. v0.9.8 removes `DATABASE_URL` from both ConfigMaps for SQL paths. The Deployment manifest now assembles `DATABASE_URL` as an explicit `env:` entry that uses K8s `$(VAR)` substitution against the envFrom-imported Secret key (`$(DB_PASSWORD)` for Helm, `$(POSTGRES_PASSWORD)` / `$(MYSQL_ROOT_PASSWORD)` for static manifests). The password lives only in the Secret. The Helm path additionally generates `DB_PASSWORD` via the lookup-or-generate template described above, so `helm install` produces a working postgres + app pair on first run with no operator setup. `MONGODB_URI` (no password in dev) and `DATABASE_URL` for SQLite (no network credential) keep their ConfigMap entries.

### Vault dev compose

The dev `docker compose -f docker/vault.yml up` flow previously seeded Vault with a literal `<baseName>-vault-jwt-secret-change-in-production` placeholder via `vault-init.sh`. v0.9.8 forwards `JWT_SECRET` from the project `.env` to the vault-init container (docker compose auto-loads `.env`), seeds Vault with the same CSPRNG hex the entrypoint sees, and falls back to a fresh `head -c 32 /dev/urandom` value when `.env` is absent. The same case-statement denylist that protects the entrypoint protects vault-init: any sentinel (including the bare `change-me-in-production` form) is substituted with a fresh random hex and a `WARNING` log line.

### CI hardening

`samples.yml` pins `dtolnay/rust-toolchain` and `Swatinem/rust-cache` to commit SHAs (with inline comments naming the branch/tag the SHA represents) so a tag-rewriting upstream supply-chain attack can't inject malicious code. A new `.github/dependabot.yml` opens weekly PRs to bump the SHAs and the npm dependency tree. A new `shellcheck docker-entrypoint.sh` step in the samples job lints the rendered entrypoint on every CI run.

### npm dependency cleanup

`npm audit` reported 24 vulnerabilities at v0.9.7 (2 low, 11 moderate, 11 high), most of them in transitive dependencies of `generator-jhipster` that the Rust blueprint never invokes at runtime. v0.9.8 brings this to zero via:

- `npm audit fix` (non-breaking) for 11 of them.
- `overrides` in `package.json` pinning `fast-xml-parser ^5.7.2`, `lodash ^4.17.24`, `lodash-es ^4.18.1`, `yaml ^2.8.4` for the remaining transitive HIGH-severity items.
- `eslint` bumped from exact `9.26.0` to exact `9.39.4` (latest 9.x with the patched `@eslint/plugin-kit`). Stayed on the v9 line because v10 changes config-file loading in a way that breaks the existing `eslint.config.js` setup.

### Tests

`generators/rust-server/entrypoint.spec.js` is new. It scaffolds a JWT-auth sample via the existing JHipster test helpers, reads the rendered entrypoint out of the in-memory FS, materialises it to a real tmp file, and spawns `bash` against it with various `JWT_SECRET` values. Seven cases cover unset → WARNING + generated, the long-form exact sentinel → FATAL, the bare `change-me-in-production` form → FATAL, the legacy timestamp-wildcard → FATAL, legitimate value → INFO + preserved, and `exec "$@"` pass-through. The Rust `sentinels.rs` unit tests cover the same matrix plus an empty-string rejection. Existing snapshot tests were regenerated for the templates that changed.

Full suite: 440 generator specs across rust-server, kubernetes, helm, docker, cypress, and client. All pass.

End-to-end on a local kind cluster: `helm install` brings postgres and the app to Ready in ~17s with no operator-supplied secrets, JWT auth roundtrip succeeds, forged tokens return 401, and sentinels are rejected at startup.

## Upgrade Notes

### Backwards compatibility

Existing 0.9.7-generated apps are untouched on disk. The generator runs at scaffold time, so v0.9.8 only affects projects you regenerate with it. Most existing dev workflows continue to work unchanged after regeneration: `admin/admin` login, `cargo run`, `npm start`, `docker compose up` for local dev. The JHipster mental model is preserved.

### What changes for `docker run`

The runtime image no longer ships `ENV DATABASE_URL=...` or `ENV MONGODB_URI=...`. If you previously ran `docker run my-jhipster-rust-app` with no environment overrides expecting the bundled defaults, you now need to supply them:

```bash
# Postgres example
docker run \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  my-jhipster-rust-app
```

`JWT_SECRET` is generated by the entrypoint on each container start when unset, so omitting it isn't fatal — but every container restart rotates the signing key, which invalidates existing tokens. Pin it explicitly when you care about session continuity.

### What changes for `kubectl apply -f k8s/`

The static `app-secret.yml` manifest now ships with `stringData: {}` (empty). `kubectl apply -f` of the unmodified file creates an empty Secret, the postgres/mysql StatefulSet exits with `CreateContainerConfigError` (it can't find `POSTGRES_PASSWORD` / `MYSQL_ROOT_PASSWORD`), and the app's startup-time check exits with `FATAL: ...JWT_SECRET...`. Three options:

1. **Edit the manifest:** uncomment the example block in `app-secret.yml` and supply real values inline.
2. **Use kubectl create:** skip applying `app-secret.yml` and run `kubectl create secret generic <app>-secret --from-literal=JWT_SECRET="$(openssl rand -hex 32)" --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 24)"`.
3. **Use the Helm chart:** `helm install ./helm/<app>` auto-generates both `JWT_SECRET` and `DB_PASSWORD` on first install and preserves them across upgrades. See `README-helm.md`.

If you previously deployed via the unmodified static manifest and it worked, you were running with publicly-known credentials — that's exactly what this release closes.

`DATABASE_URL` is no longer in `app-configmap.yml` for the SQL paths. It now lives in `app-deployment.yml` as an explicit `env:` entry that interpolates the password via K8s `$(POSTGRES_PASSWORD)` / `$(MYSQL_ROOT_PASSWORD)` substitution against the Secret. If you have CI tooling or operators reading `DATABASE_URL` out of the ConfigMap, point it at the Deployment env instead.

### What changes for `helm install`

The Helm chart now auto-generates random `JWT_SECRET` and `DB_PASSWORD` values on first install via the lookup-or-generate template, and preserves them across `helm upgrade` runs so existing tokens stay valid and the persisted database remains readable. `helm install <release> ./helm/<app>` works with no `--set` flags. To pin specific values, pass `--set secrets.JWT_SECRET="$(openssl rand -hex 32)" --set secrets.DB_PASSWORD="$(openssl rand -base64 24)"`. The chart's `DATABASE_URL` is assembled inside the rendered Deployment via `$(DB_PASSWORD)` env substitution against the chart-managed Secret — operators no longer need to reconcile a hardcoded password in `values.yaml` against the StatefulSet's expected key.

### What changes for `docker compose -f docker/vault.yml up`

The dev vault-init container now reads `JWT_SECRET` from the project's `.env` (docker compose auto-loads it from CWD) instead of writing a literal placeholder into Vault. If `.env` is absent or `JWT_SECRET` is empty, vault-init generates a fresh random hex for the dev seed. No operator action required for the default workflow.

### What changes for production CORS

`APP_ENV=production` now requires `CORS_ALLOWED_ORIGINS` to be set to a comma-separated list of origins. Empty or missing → the app refuses to start with a clear error. Development deployments (`APP_ENV=development`, the default) are unchanged.

### What changes for container UID

The container runs as UID 1001. K8s deployments enforce this with `securityContext.runAsUser: 1001`. If you have external volumes mounted into the pod with restrictive ownership, you may need to set `fsGroup: 1001` on the pod's `securityContext` or pre-chown the volume contents.

### Generator-jhipster pin

`package.json` still pins `^9.0.0`. The npm `overrides` field forces transitive deps to known-fixed versions. Future Dependabot PRs will keep them current.

---

# Release Notes - v0.9.7

## Overview

JHipster Rust Blueprint v0.9.7 is the **largest release since v0.9.0**. It upgrades the blueprint to **JHipster 9.0.0** (from 8.11.0), which brings a significant number of upstream breaking changes — new sub-generator namespaces, a reorganised support module layout, a workspace-oriented client layout (`client/` subfolder), the Angular 17+ Vite-based dev server, and renamed Angular component files. On top of the upgrade work, the release hardens entity generation across all four supported databases (SQLite, PostgreSQL, MySQL, MongoDB), fixes a long list of bugs that surfaced when generating sample projects with non-trivial relationships, restores the standard `npm start` / `docker build` / `cargo build && cargo run` workflows end-to-end, and lands 44 new regression tests so the same issues do not come back.

Every generator in the blueprint (`rust-server`, `client`, `common`, `server`, `entity`, `docker`, `languages`, `cypress`, `ci-cd`, `kubernetes`, `kubernetes:helm`, and the new `base-application:bootstrap`) was touched during the upgrade; every test snapshot was regenerated; and both existing and new sample projects (SQLite/Angular, MySQL/React, PostgreSQL/Angular, MongoDB/Angular) were regression-tested end to end — generation, compilation, migrations, server startup, and the Angular UI.

## What's New in v0.9.7

### Upgrade to JHipster 9.0.0

JHipster 9 is a major upstream release with a number of breaking changes that required updates across every generator in this blueprint. If you are maintaining a private fork of the blueprint or you built tooling against the v0.8.x / v0.9.x APIs, the items below are the ones you will care about.

#### Dependency and engine bumps

| Field                         | v0.9.6                    | v0.9.7                     |
| ----------------------------- | ------------------------- | -------------------------- |
| `generator-jhipster`          | `8.11.0`                  | `^9.0.0`                   |
| `engines.generator-jhipster`  | `8.11.0`                  | `9.0.0`                    |
| `engines.node`                | `^18.19.0 \|\| >= 20.6.1` | `^22.18.0 \|\| >= 24.11.0` |
| `keywords`                    | `jhipster-8`              | `jhipster-9`               |
| `.yo-rc.json` jhipsterVersion | `8.11.0`                  | `9.0.0`                    |

Node 18 and Node 20 are no longer supported — Node 22.18+ or Node 24.11+ is required. This matches the baseline JHipster 9 supports.

#### Sub-generator namespace restructuring

JHipster 9 renamed several sub-generators and introduced the `<parent>:<child>` namespace convention. The blueprint's sub-generator directories were reorganised to match:

| v0.9.6                                       | v0.9.7                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------- |
| `generators/bootstrap-application/`          | `generators/base-application/generators/bootstrap/`                             |
| `generators/kubernetes-helm/`                | `generators/kubernetes/generators/helm/`                                        |
| `dependsOnJHipster('bootstrap-application')` | `dependsOnBootstrapApplication()` (shorthand) or `dependsOnBootstrap('server')` |
| `generator-jhipster/generators/base/support` | `generator-jhipster/generators/base-core/support`                               |
| CLI: `jhipster-rust kubernetes-helm`         | CLI: `jhipster-rust kubernetes:helm`                                            |

The `.yo-rc.json` `generators` block and `subGenerators` list were updated accordingly, and the `docs/KUBERNETES.md` instructions now reference the new `jhipster-rust kubernetes:helm` command form.

#### New `base-application:bootstrap` sub-generator

JHipster 9 requires blueprints to contribute a dedicated `base-application:bootstrap` generator instead of stashing initialisation logic in the server entry point. The blueprint now ships one at `generators/base-application/generators/bootstrap/generator.js` that runs with `sbsBlueprint: true` and sets:

- `jhipsterConfig.backendType = 'Rust'` (so the base JHipster generators know this isn't a Java/Spring Boot project)
- `jhipsterConfig.withAdminUi = false`
- `application.clientRootDir = 'client/'`, `application.clientSrcDir = 'client/src/'`, `application.clientTestDir = 'client/test/'` (the JHipster 9 workspace model — see below)
- `application.rustServerRootDir = 'server/'`
- For Angular specifically, forces Authority `skipClient = false` for `builtIn` authority entity so user-management UI renders correctly

#### Workspace-oriented client layout (`client/` subfolder)

JHipster 9 formalises the "client as a separate npm workspace" layout. In this blueprint:

- The Angular / React / Vue client lives in `client/` (not at the project root as in v0.9.6)
- Root `package.json` declares `"workspaces": ["client"]`
- `docker/`, `migrations/`, `server/`, and `Cargo.toml` live at the project root next to the `client/` workspace
- Diesel schema lives at `server/src/db/schema.rs`

This is a **breaking change** for projects regenerated from v0.9.6 — source file locations under `client/src/**` have moved and the webapp build output is now at `server/dist/static/` instead of `target/static/`.

#### Angular component file renames

JHipster 9 drops the `.component.ts` / `.component.html` / `.component.scss` / `.component.spec.ts` file suffixes for Angular components. All generated Angular files now use the shorter forms: `activate.ts` / `activate.html` / `activate.spec.ts` instead of `activate.component.{ts,html,spec.ts}`. Every snapshot test was regenerated to match.

#### Angular dev server and build pipeline

- **Dev server**: `ng serve` in Angular 17+ uses **Vite** under the hood. A new `client/proxy.config.mjs` proxies `/api/*`, `/management/*`, and `/v3/api-docs` to the Rust backend on port 8080.
- **Build plugins**: A new `client/build-plugins/` directory ships two esbuild plugins (`define-esbuild.ts`, `i18n-esbuild.ts`) that were previously Webpack loaders in v0.9.6.
- **Lint config format**: `eslint.config.mjs` → `eslint.config.ts` (TypeScript flat config).
- **Test runner**: Jest is gone (`jest.conf.js` removed); the blueprint now uses Vitest everywhere, consistent with JHipster 9's Angular defaults.
- **Docker build**: The `client-builder` Dockerfile stage uses `npm install --force` (instead of `--legacy-peer-deps`) and invokes `npm run webapp:prod` (instead of `ng build --configuration=production`). A small inline Node script strips `ESLintWebpackPlugin` from any legacy webpack config that might still be around — linting runs during development, not during the container build.

#### Kubernetes workspace-model workaround

JHipster 9's kubernetes generator expects a workspace deployment model where multiple apps live under `<workspaceRoot>/<appName>/`. For single-app deployments the blueprint now sets `jhipsterConfig.directoryPath = '.'` in both `kubernetes/generator.js` and `kubernetes/generators/helm/generator.js` `beforeQueue` hooks, so the generated manifests resolve paths relative to the current project instead of a non-existent parent workspace.

#### `backendType: 'Rust'` auto-inference

Base JHipster 9 expects projects to declare their `backendType` so framework-specific generators (spring-boot, data-relational, etc.) can opt out. The `base-application:bootstrap` generator now sets `backendType = 'Rust'` during the configuring phase, preventing JHipster from trying to compose the Spring Boot backend generator when our blueprint is active.

#### `databaseType` auto-derivation

JHipster 9's server bootstrap generates built-in entities (`User`, `Authority`) only when `databaseType` is set. In v0.9.6 only `devDatabaseType` was captured from the prompt, which meant the built-in entities were skipped for React/Angular clients that needed them for user-management. The rust-server `configuring` task now derives `databaseType` from `devDatabaseType`:

```js
if (!this.jhipsterConfig.databaseType && devDb) {
  if (['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'sqlite'].includes(devDb)) {
    this.jhipsterConfig.databaseType = 'sql';
  } else if (devDb === 'mongodb') {
    this.jhipsterConfig.databaseType = 'mongodb';
  }
}
```

#### Rust-side improvements riding along with the upgrade

While migrating to JHipster 9, a handful of Rust-side quality fixes were folded in:

- **`.cargo/config.toml`** now forces `RUST_TEST_THREADS=1` for PostgreSQL and MySQL projects. Integration tests share a single database and are not isolated from each other, so they must run sequentially to avoid flakes on shared fixtures.
- **`test_utils.rs`** was refactored to use `OnceLock<DbPool>` instead of `Once`. The old `Once`-based pool initialisation would poison on the first failure (e.g. DB not reachable) and cascade the failure into every subsequent test. With `OnceLock::get_or_init`, each test retries independently.
- **Angular `@popperjs/core` dependency** is now explicitly listed in `client/package.json` for Angular projects. It's a peer dependency of `@ng-bootstrap/ng-bootstrap` and `bootstrap`, and `npm install --legacy-peer-deps` (used in the Dockerfile) wouldn't resolve it without an explicit entry.
- **PostgreSQL and MySQL integration tests** consistent with the docker-compose credentials (`<baseName>` user with trust auth, not hardcoded `postgres:postgres`).

### Multi-Database Entity Generation

The blueprint now correctly generates compilable, runnable Rust code for monolith projects on **SQLite, PostgreSQL, MySQL, and MongoDB**. Previous versions had a number of latent issues that only manifested with non-default databases or non-trivial relationship topologies.

#### `rust-server` now depends on the JHipster server bootstrap

- **Root cause**: `rust-server` only called `dependsOnBootstrapApplication()`, which left the JHipster _server_ bootstrap unrun. Server bootstrap is what populates `entity.persistClass`, `entity.entityClass`, `relationship.otherEntityTableName`, `relationship.joinTable`, etc. Without it, every entity template that referenced one of those properties exploded.
- **Fix**: Added `await this.dependsOnBootstrap('server')` in `rust-server/generator.js`'s `beforeQueue`. This ensures every code path that produces an entity (`jhipster-rust`, `jhipster-rust:rust-server`, `jhipster-rust:entity`) gets a fully populated entity object regardless of how it was invoked.

#### Relationship property backfill (`backfillRelationshipForRust`)

- **Root cause**: Even when server bootstrap runs, JHipster's `prepareRelationshipForDatabase` only sets `joinTable` for _SQL_ many-to-many relationships (`databaseTypeSql && relationshipManyToMany && ownerSide`). For MongoDB, `rel.joinTable` was undefined and the Rust MongoDB service template (which uses it as a link-collection name) crashed at `<%= rel.joinTable.name %>`. Similarly, `relationship.otherEntityTableName` was sometimes unset and produced broken SQL like `_id INTEGER NOT NULL REFERENCES (id) ON DELETE CASCADE`.
- **Fix**: Introduced a shared `backfillRelationshipForRust(entity, relationship)` helper in `generator-rust-constants.js`. It mirrors `relationship.otherEntity.entityTableName` into `relationship.otherEntityTableName`, synthesises a `joinTable.name` for owner-side many-to-many, and normalises the join-table name to a single-underscore separator. Wired into `PREPARING_EACH_ENTITY_RELATIONSHIP` for both `rust-server` and the `entity` sub-generator. Applies uniformly to SQL **and** MongoDB.

#### Rust file naming no longer depends on a client property

- **Root cause**: `rust-server/files.js` and `postWritingEntitiesTemplateTask` derived `snake_case` file names from `entity.entityFileName`, which is set by JHipster's **client** generator (`client/entity.js:36`). With `clientFramework: 'no'` or `skipClient: true`, that property was undefined and `toSnakeCase(undefined)` crashed.
- **Fix**: Added a shared `rustEntityFileName(entity)` helper that falls back to `entityNameKebabCase` (always populated by base entity preparation) → `entityFileName` → `entityInstance` → `name`. Wired into both `files.js` and `generator.js`'s POST_WRITING_ENTITIES task.

### SQL Migration Generation

#### Many-to-many join tables now live in their own migration files

- **Root cause**: Join-table `CREATE TABLE` statements used to be inlined into the per-entity migration template (`migrations/entity/up.sql.ejs`). For a `Store ↔ Product` many-to-many, the Store migration tried to create `rel_store_products` with FKs to `store(id)` AND `product(id)`. Because Store's `changelogDate` is earlier than Product's, the FK to `product(id)` was evaluated before the `product` table existed:
  - **PostgreSQL / MySQL**: silently refused the FK constraint, the join table was never created, and `cargo build` then failed because the model imports `crate::db::schema::rel_store_products` and `print-schema` skipped the missing table
  - **SQLite**: tolerated it because FK enforcement is off by default — the bug was masked
- **Fix**: New `migrations/join_table/up.sql.ejs` and `down.sql.ejs` templates. Each owner-side many-to-many emits its own migration directory with a deterministic timestamp computed as `bumpMigrationTimestamp(maxEntityChangelogDate, n)` — strictly greater than every entity's changelogDate, so the join-table migration always runs after both endpoint tables exist on every database. The entity templates no longer contain inline join-table SQL.

#### ALTER TABLE migrations for new foreign-key columns on existing entities

- **Root cause**: When a new entity was added that introduced a back-reference to an existing entity (e.g. adding `Order` with a one-to-many to `Product`, which gives `Product` a many-to-one back-reference and a new `order_id` column), the entity sub-generator regenerated the existing entity's model file with the new field but did NOT generate a migration to add the column to the existing table. The next `cargo build` failed with `cannot find type 'order_id' in module 'crate::db::schema::product'`.
- **Fix**: The entity sub-generator's `WRITING_ENTITIES` task now scans existing migrations for FK columns of every many-to-one / owner-side one-to-one relationship. For each missing column it emits an `ALTER TABLE … ADD COLUMN … REFERENCES …` migration via the new `migrations/alter_add_column/up.sql.ejs` template, with a unique timestamp.

#### `diesel migration run` now runs automatically in the END phase

- **Root cause**: After writing entity migrations, the user had to manually run `diesel migration run` to update `server/src/db/schema.rs` before `cargo build` would succeed. Only the entity sub-generator did this — the rust-server full-generation flow left it as a manual step.
- **Fix**: Extracted the migration runner into a shared `runDieselMigrations(generator)` helper and added an END task to `rust-server/generator.js` that invokes it. Mongo backends are automatically skipped. Fresh project generation now produces a project that compiles with a single `cargo build` (assuming a reachable database for PG/MySQL).

### Diesel & DTO Improvements

#### Diesel queries now use `Selectable::as_select()` for column-name matching

- **Root cause**: The Diesel service template emitted `.load::<Entity>(conn)` and `.first::<Entity>(conn)` which use `Queryable`'s positional column matching. After an `ALTER TABLE ADD COLUMN` appended a new FK column to the end of an existing table, the model and schema fell out of position-order alignment and every query failed to compile with `the trait bound (...): CompatibleType<...>` errors.
- **Fix**: All Diesel query sites in `services/_entityFileName_service.rs.ejs` now emit `.select(Entity::as_select()).load(conn)` / `.select(Entity::as_select()).first(conn)`. The `Selectable` derive matches columns by _name_ instead of position, so column ordering between the model struct and the actual table no longer matters. MongoDB service template is unaffected (it doesn't use Diesel).

#### DTO fields with `snake_case` JHipster names now serialise correctly

- **Root cause**: Every generated DTO struct had `#[serde(rename_all = "camelCase")]`, which converts a Rust field name like `customer_name` into the JSON key `customerName`. But when a user named a JHipster field `customer_name` (which JHipster preserves as-is), the React/Angular form sends `customer_name` in the request body and the Rust deserializer rejected it with `missing field 'customerName'`.
- **Fix**: All three DTO structs (`<Entity>Dto`, `Create<Entity>Dto`, `Update<Entity>Dto`) now emit an explicit `#[serde(rename = "<jhipster_fieldName>")]` for fields whose JHipster name doesn't match what `rename_all = "camelCase"` would produce. CamelCase fields are unchanged (no redundant rename).

#### `RelationshipId` deserializer now accepts string-encoded integer IDs

- **Root cause**: React multi-selects emit `{id: "1"}` because HTML form values are always strings. The Rust `RelationshipId` deserializer was an untagged enum with only `Id(i32)` and `Object { id: i32 }` variants, so the string-typed `id` field was rejected with `data did not match any variant of untagged enum IdOrObject at line 1 column 69`. This affected all React-generated UIs trying to set many-to-many relationships.
- **Fix**: Rewrote `RelationshipId::deserialize` and `deserialize_optional_relationship` in `dto/common.rs.ejs` to use a `parse_i32_value` helper that accepts both numeric (`1`) and string-encoded (`"1"`) integers via `serde_json::Value`. Works for React, Angular, and Vue clients without any frontend changes.

### Client / Developer Experience

#### Workspace-root `npm start` / `build` / `test` / `lint` scripts

- **Root cause**: The blueprint puts the client in a `client/` workspace subfolder, but JHipster's base layout assumes the client lives at the project root. Users running `npm start` from the project root got `npm error Missing script: "start"` and had to `cd client && npm start` instead.
- **Fix**: A new `addRootClientWorkspaceScripts` task in `client/generator.js`'s POST_WRITING phase forwards `start`, `build`, `test`, and `lint` from the workspace root to the `client/` workspace via `npm run -w client/ <script>`. Existing root scripts are not clobbered.

#### React workspace overrides for `react-redux-loading-bar`

- **Root cause**: Base JHipster's React generator wrote `"overrides": { "react-redux-loading-bar": { "react": "$react", "react-dom": "$react-dom" } }` to the **root** `package.json`. The `$react` self-reference only resolves when the same `package.json` declares `react` as a dependency, but in our workspace layout `react` lives in `client/package.json` — so npm install printed a long wall of `ERESOLVE overriding peer dependency` warnings about every package that pulled in React.
- **Fix**: New `fixWorkspaceOverrides` task in `client/generator.js`'s `POST_WRITING_ENTITIES` phase reads the actual react / react-dom version from `client/package.json` and rewrites the root override entries with explicit version strings via `Storage.merge()`. Runs after the React generator's `clientBundler` task but before mem-fs commits to disk, so no overwrite-conflict prompt is triggered.

#### Swagger UI dev-mode assets (Angular only)

- **Root cause**: The Vite-based Angular dev server (Angular 17+) does not honor `angular.json` `assets` glob entries that source files from `node_modules/`. So when running `npm start`, the swagger UI iframe's required runtime files (`swagger-ui-bundle.js`, `swagger-ui-standalone-preset.js`, `swagger-ui.css`, `axios.min.js`) all returned 404 and the iframe at `/admin/docs` was blank around the Angular page chrome. Production builds were unaffected because the build pipeline copies the assets correctly.
- **Fix**: A new `fixSwaggerUiDevAssets` task generates `client/scripts/copy-swagger-ui-assets.cjs` — a small helper that resolves `swagger-ui-dist/` and `axios/` via `require.resolve('<pkg>/package.json')` (works around the modern `exports` field that blocks direct `./dist/` subpath resolves) and copies the runtime files into `client/src/swagger-ui/` where the dev server happily serves them as plain static assets. The task adds `prestart` and `postinstall` lifecycle hooks to `client/package.json` to invoke the helper, plus a `client/src/swagger-ui/.gitignore` entry so the auto-copied files don't pollute `git status`. The fix is gated on `clientFrameworkAngular` — React/Vue projects are unaffected.

#### Dockerfile fix for the swagger-ui postinstall hook

- **Root cause**: The `client-builder` Dockerfile stage copies only `client/package.json` first (for layer caching), then runs `npm install --force`, then copies the rest of `client/`. The new postinstall hook referenced `scripts/copy-swagger-ui-assets.cjs` which didn't exist in the build context yet, aborting `docker build` with `Cannot find module '/app/client/scripts/copy-swagger-ui-assets.cjs'`.
- **Fix**: The `Dockerfile.ejs` template now copies `client/scripts/` into the build context **before** `npm install`, gated on `clientFrameworkAngular`. React/Vue projects don't get the extra COPY layer.

### Generator Hygiene

#### "Could not retrieve version of blueprint" warnings silenced

- **Root cause**: Yeoman sets `_meta.packagePath` to the package **directory**, but JHipster's `storeBlueprintVersion` feature does `readFileSync(this._meta.packagePath, 'utf8')` and expects a file path to `package.json`. The feature is enabled by default in `BaseApplicationGenerator` so every blueprint generator emitted `Could not retrieve version of blueprint 'jhipster-rust:<name>'` at startup.
- **Fix**: `fixBlueprintPackagePath(generator)` helper in `generator-rust-constants.js` registers a `before:queueOwnTasks` listener (via `prependOnceListener` so it runs before JHipster's own handler) that appends `/package.json` to `_meta.packagePath` when it's a directory. Wired into the constructor of every generator in the blueprint.

#### `list` → `select` prompt deprecation

- **Root cause**: Inquirer's `list` prompt type is deprecated in favor of `select`, producing console noise like `` `list` prompt is deprecated. Use `select` prompt instead. ``
- **Fix**: Updated all 11 prompt definitions across `rust-server/command.js`, `kubernetes/generator.js`, `kubernetes/generators/helm/generator.js`, and `.blueprint/generate-sample/command.mjs`.

### Test Coverage

44 new regression tests added across three new spec files (389 → **433 total**):

| Test File                                          | New Tests | Coverage                                                                                                                                                                                             |
| -------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generators/rust-server/entity-generation.spec.js` | **31**    | Cross-database entity generation matrix (sqlite, postgresql, mysql, mongodb): models, DTOs, migrations, join-table ordering, RelationshipId, Selectable, `snake_case` rename, MongoDB-specific paths |
| `generators/client/dev-experience.spec.js`         | **8**     | Angular & React workspace scripts, swagger-ui dev helper, `.gitignore`, Dockerfile `COPY client/scripts` ordering, React workspace overrides, non-Angular gating                                     |
| `generators/entity/regression.spec.js`             | **5**     | `jhipster-rust:entity` sub-generator paths: relationship backfill, join-table migration timestamps, `snake_case` DTO rename across all three DTO structs                                             |

Each test maps directly to a session bug and includes an inline comment describing the original symptom — so a future regression of the same shape fails the build with a clear breadcrumb instead of producing broken sample projects.

## Upgrade Notes

### Breaking changes at a glance

This is a **non-backward-compatible** release due to the JHipster 9 upstream upgrade. The blueprint itself cannot be consumed from a JHipster 8 host; existing projects generated by v0.9.6 or earlier will need to be regenerated against JHipster 9.

Before you run `jhipster-rust` against a v0.9.6 project, verify your host environment:

```bash
node --version        # must be >= 22.18.0 or >= 24.11.0
jhipster --version    # must report 9.0.0
```

If you were running the blueprint in a CI environment pinned to Node 18/20, you'll need to bump your CI image to Node 22+ as well.

### Migrating an existing v0.9.6 project

Because of the client-layout move (root → `client/` workspace) and the Angular component file renames, the safest path is a clean regeneration rather than an in-place upgrade:

```bash
# From your project root
rm -rf client/ server/src/app/ target/static/ client-src/
jhipster-rust --force
```

JHipster 9 writes generated files to the new workspace layout automatically, but stale files from the old layout will linger if you don't clean them up. Your `.yo-rc.json` will be updated in place; your `.jhipster/*.json` entity descriptors are preserved.

If you were using `jhipster-rust kubernetes-helm`, update any automation to the new command name:

```diff
- jhipster-rust kubernetes-helm
+ jhipster-rust kubernetes:helm
```

### Sample project regeneration

Existing projects generated by v0.9.6 should be regenerated with `jhipster-rust --force` to pick up both the JHipster 9 layout changes and the stability fixes landed in v0.9.7 (SQL migration restructuring, Selectable query rewrite, DTO `snake_case` rename behavior, etc.). After regeneration:

```bash
# SQLite — fully self-contained
cargo build && cargo run

# PostgreSQL / MySQL — start the bundled docker compose first
docker compose -f docker/postgresql.yml up -d   # or mysql.yml
cargo build && cargo run

# MongoDB — same idea
docker compose -f docker/mongodb.yml up -d
cargo build && cargo run
```

`diesel migration run` is now invoked automatically in the END phase for SQL backends, so re-running `jhipster-rust --force` against an existing project will refresh `server/src/db/schema.rs` for you.

### Existing many-to-many entities

If your project already had many-to-many relationships generated with v0.9.6, the join-table SQL was inlined in the entity migration. After upgrading to v0.9.7 the entity migration template no longer emits inline join-tables, so you may want to:

1. Drop the existing project's database (or `diesel migration revert --all`)
2. Regenerate with `jhipster-rust --force`
3. Run `diesel migration run` (or simply re-run `jhipster-rust --force` and let the END phase do it)

For PostgreSQL / MySQL projects this also fixes the latent FK constraint that was silently dropped on the old layout.

### Running the dev server (Angular)

The `npm start` command now works from the project root (it forwards to the `client/` workspace). After `npm install` from the root, in two terminals:

```bash
# Terminal 1
cargo run

# Terminal 2
npm start
```

The Angular dev server proxies `/api/*`, `/management/*`, and `/v3/api-docs` to the Rust backend on port 8080, and the swagger UI at `/admin/docs` now renders correctly thanks to the postinstall asset copy.

### Running the Docker container

The container is built and run in **production** mode by default (`APP_ENV=production`). In production, the dev ribbon and the API menu item are intentionally hidden — both are gated on the `dev` / `api-docs` JHipster profiles for security reasons (matching base JHipster Spring Boot behavior).

To run the container with the dev ribbon and API menu item visible:

```bash
docker run -e APP_ENV=development -p 8181:8080 <image>:latest
# or
docker run -e APP_PROFILE=dev -p 8181:8080 <image>:latest
```

No rebuild is needed — `APP_ENV` / `APP_PROFILE` are read at runtime by `/management/info`.

---

# Release Notes - v0.9.6

## Overview

JHipster Rust Blueprint v0.9.6 adds distributed tracing support with Zipkin and Jaeger for microservices and gateway applications, fixes several deployment issues across Docker, Kubernetes, and Helm, and improves PostgreSQL credential handling for local development.

## What's New in v0.9.6

### Distributed Tracing (Zipkin / Jaeger)

OpenTelemetry-based distributed tracing is now available for microservice and gateway applications. During project generation, you can choose between Zipkin and Jaeger:

```
? Would you like to enable distributed tracing for your application?
  No distributed tracing
  Zipkin (lightweight distributed tracing)
  Jaeger (full-featured distributed tracing with Jaeger UI)
```

This feature is **not available for monolith applications** — the prompt only appears for microservice and gateway app types.

#### What's Generated

| Layer              | Zipkin                                          | Jaeger                                               |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------- |
| **Rust code**      | `tracing_config.rs` with Zipkin HTTP exporter   | `tracing_config.rs` with OTLP gRPC exporter          |
| **Dependencies**   | `opentelemetry-zipkin`                          | `opentelemetry-otlp` with tonic                      |
| **Docker Compose** | `docker/tracing.yml` with `openzipkin/zipkin:3` | `docker/tracing.yml` with `jaegertracing/all-in-one` |
| **Kubernetes**     | Zipkin Deployment + Service                     | Jaeger Deployment + Service (UI + OTLP ports)        |
| **Helm**           | Zipkin template with `Values.zipkin.enabled`    | Jaeger template with `Values.jaeger.enabled`         |
| **Documentation**  | `docs/DISTRIBUTED_TRACING.md`                   | `docs/DISTRIBUTED_TRACING.md`                        |

#### Configuration

| Variable               | Description                        | Default                                                                       |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `TRACING_ENABLED`      | Enable/disable distributed tracing | `true`                                                                        |
| `TRACING_SERVICE_NAME` | Service name reported in traces    | `<baseName>`                                                                  |
| `TRACING_ENDPOINT`     | Tracing backend endpoint           | Zipkin: `http://localhost:9411/api/v2/spans`, Jaeger: `http://localhost:4317` |
| `TRACING_SAMPLE_RATIO` | Sampling ratio (0.0 to 1.0)        | `1.0`                                                                         |

#### OpenTelemetry Integration

The tracing layer integrates with the existing `tracing` + `tracing-subscriber` stack:

- OTel layer is composed directly on `Registry` (innermost layer) to avoid type mismatches
- `Option<OpenTelemetryLayer>` passed to `.with()` — acts as no-op when tracing is disabled at runtime
- Graceful shutdown flushes pending spans via `shutdown_tracer_provider()`

### Bug Fixes

#### Production Ribbon Fix (All App Types)

- **Root cause**: The `/management/info` endpoint set `display-ribbon-on-profiles` to the current active profile (e.g., `"prod"`), causing the Angular UI to show a ribbon in every environment including production
- **Fix**: `display-ribbon-on-profiles` is now always `"dev"`. The Angular client only shows the ribbon when this value appears in `activeProfiles`, so the ribbon correctly shows in development and is hidden in production
- **Scope**: Affects monolith, microservice, and gateway applications

#### APP_ENV Missing for Monoliths in K8s/Helm

- **Root cause**: `APP_ENV: "development"` was only set inside the `serviceDiscoveryConsul` conditional block in K8s configmaps and Helm values, so monolith deployments inherited `APP_ENV=production` from the Dockerfile
- **Fix**: Moved `APP_ENV: "development"` to the common config section in both `app-configmap.yml` and `values.yaml`, ensuring all app types get the correct environment in K8s/Helm deployments
- **Symptom**: Monolith apps showed "translation-not-found" instead of "Development" ribbon

#### Microservice Port Fix in K8s/Helm

- **Root cause**: K8s configmaps, Helm values, deployments, and services all hardcoded port `8080`, but microservices use port `8081`
- **Fix**: Added `appPort` context variable (`8081` for microservices, `8080` for everything else) and updated all templates to use it
- **Files updated**: `app-configmap.yml`, `app-deployment.yml`, `app-service.yml`, `monitoring.yml`, `values.yaml`, `deployment.yaml`, `monitoring.yaml`, `NOTES.txt`, `kubectl-apply.sh`

#### PostgreSQL Credentials Mismatch

- **Root cause**: JHipster's `docker/postgresql.yml` creates a PostgreSQL user matching `baseName` with trust auth (no password), but the `.env` and `test_utils.rs` hardcoded `postgres:postgres`
- **Fix**: Updated `.env` and `test_utils.rs` templates to use `<%= baseName %>` as the PostgreSQL user with no password, matching the Docker Compose configuration
- **Note**: K8s/Helm deployments are unaffected — they use their own PostgreSQL StatefulSets with `postgres:postgres` credentials

#### Helm values.yaml Template Expressions

- **Root cause**: `TRACING_ENDPOINT` in `values.yaml` used Helm template expressions (`{{ .Release.Name }}`), but `values.yaml` is a data file where Helm expressions are not evaluated
- **Fix**: Replaced with EJS `<%= baseName.toLowerCase() %>` which resolves at generation time

#### Jaeger Docker Image

- **Root cause**: Templates used `jaegertracing/jaeger:2` which doesn't exist on Docker Hub
- **Fix**: Updated to `jaegertracing/all-in-one:latest` across all templates (Docker Compose, K8s, Helm, deploy scripts)

### Deployment Script Improvements

- **Image pre-loading**: `helm-apply.sh` and `kubectl-apply.sh` now pre-load Zipkin/Jaeger images into local cluster nodes
- **K8s tracing manifests**: `kubectl-apply.sh` now applies and deletes `tracing.yml` with rollout status checks
- **Port-forward instructions**: `NOTES.txt` and `kubectl-apply.sh` use the correct port for microservices

### Test Coverage

63 new tests added across all generators (326 to 389 total):

| Test File                           | New Tests | What They Cover                                                                                                 |
| ----------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `rust-server/generator.spec.js`     | 42        | Zipkin+microservice, Jaeger+gateway, monolith rejection, no-tracing microservice, Zipkin+Prometheus coexistence |
| `kubernetes/generator.spec.js`      | 10        | Zipkin K8s, Jaeger K8s, monolith tracing rejection                                                              |
| `kubernetes-helm/generator.spec.js` | 11        | Zipkin Helm, Jaeger Helm, monolith tracing rejection                                                            |

### Documentation

- **docs/DISTRIBUTED_TRACING.md**: New comprehensive guide covering both Zipkin and Jaeger, configuration, Docker/K8s/Helm deployment, sampling strategies, backend comparison, and troubleshooting
- **README.md**: Added Distributed Tracing to implemented features table, added documentation link, removed from "Not Yet Implemented" list, updated K8s infrastructure manifests entry

## Upgrade Notes

### Adding Distributed Tracing to Existing Projects

1. Regenerate your microservice or gateway project with `jhipster-rust --force`
2. Select Zipkin or Jaeger when prompted
3. For Docker: `docker compose -f docker/tracing.yml up -d`
4. For Helm: regenerate charts with `jhipster-rust kubernetes-helm --force`

### PostgreSQL Credential Change

If you have an existing PostgreSQL project, the `DATABASE_URL` in `.env` now uses `<baseName>` as the user instead of `postgres`. After regenerating:

1. Stop and remove your existing PostgreSQL container: `docker compose -f docker/postgresql.yml down -v`
2. Start a fresh container: `docker compose -f docker/postgresql.yml up -d`
3. Run tests: `cargo test -- --test-threads=1`

### Monolith Ribbon Fix

If your monolith app shows "Production" ribbon or "translation-not-found" in K8s/Helm, regenerate the project and redeploy. The fix applies automatically.

---

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
