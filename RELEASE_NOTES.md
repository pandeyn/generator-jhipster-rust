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
