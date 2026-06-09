import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';

import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { createNeedleCallback } from 'generator-jhipster/generators/base-core/support';
import { isReservedPostgresqlKeyword } from 'generator-jhipster/generators/spring-boot/generators/data-relational/support';

import {
  SERVER_RUST_SRC_DIR,
  backfillRelationshipForRust,
  bumpMigrationTimestamp,
  fixBlueprintPackagePath,
  runDieselMigrations,
  rustEntityFileName,
} from '../generator-rust-constants.js';

import { entityFiles, serverFiles } from './files.js';

const rustFieldTypes = {
  Boolean: 'bool',
  Integer: 'i32',
  Long: 'i64',
  Float: 'f32',
  Double: 'f64',
  BigDecimal: 'bigdecimal::BigDecimal',
  String: 'String',
  UUID: 'uuid::Uuid',
  LocalDate: 'chrono::NaiveDate',
  Instant: 'NaiveDateTime',
  ZonedDateTime: 'NaiveDateTime',
  Duration: 'i64',
  TextBlob: 'String',
  Blob: 'Vec<u8>',
  AnyBlob: 'Vec<u8>',
  ImageBlob: 'Vec<u8>',
};

const dieselColumnTypes = {
  Boolean: 'Bool',
  Integer: 'Integer',
  Long: 'BigInt',
  Float: 'Float',
  Double: 'Double',
  BigDecimal: 'Numeric',
  String: 'Text',
  UUID: 'Text',
  LocalDate: 'Date',
  Instant: 'Timestamp',
  ZonedDateTime: 'Timestamp',
  Duration: 'BigInt',
  TextBlob: 'Text',
  Blob: 'Binary',
  AnyBlob: 'Binary',
  ImageBlob: 'Binary',
};

const sqliteColumnTypes = {
  Boolean: 'BOOLEAN',
  Integer: 'INTEGER',
  Long: 'BIGINT',
  Float: 'REAL',
  Double: 'REAL',
  BigDecimal: 'DECIMAL',
  String: 'TEXT',
  UUID: 'TEXT',
  LocalDate: 'DATE',
  Instant: 'TIMESTAMP',
  ZonedDateTime: 'TIMESTAMP',
  Duration: 'BIGINT',
  TextBlob: 'TEXT',
  Blob: 'BLOB',
  AnyBlob: 'BLOB',
  ImageBlob: 'BLOB',
};

const postgresColumnTypes = {
  Boolean: 'BOOLEAN',
  Integer: 'INTEGER',
  Long: 'BIGINT',
  Float: 'REAL',
  Double: 'DOUBLE PRECISION',
  BigDecimal: 'DECIMAL',
  String: 'VARCHAR(255)',
  UUID: 'UUID',
  LocalDate: 'DATE',
  Instant: 'TIMESTAMP',
  ZonedDateTime: 'TIMESTAMP WITH TIME ZONE',
  Duration: 'BIGINT',
  TextBlob: 'TEXT',
  Blob: 'BYTEA',
  AnyBlob: 'BYTEA',
  ImageBlob: 'BYTEA',
};

const dieselColumnTypesPostgres = {
  Boolean: 'Bool',
  Integer: 'Int4',
  Long: 'Int8',
  Float: 'Float4',
  Double: 'Float8',
  BigDecimal: 'Numeric',
  String: 'Varchar',
  UUID: 'Uuid',
  LocalDate: 'Date',
  Instant: 'Timestamp',
  ZonedDateTime: 'Timestamptz',
  Duration: 'Int8',
  TextBlob: 'Text',
  Blob: 'Bytea',
  AnyBlob: 'Bytea',
  ImageBlob: 'Bytea',
};

const mysqlColumnTypes = {
  Boolean: 'BOOLEAN',
  Integer: 'INTEGER',
  Long: 'BIGINT',
  Float: 'FLOAT',
  Double: 'DOUBLE',
  BigDecimal: 'DECIMAL(21,2)',
  String: 'VARCHAR(255)',
  UUID: 'VARCHAR(36)',
  LocalDate: 'DATE',
  Instant: 'DATETIME',
  ZonedDateTime: 'DATETIME',
  Duration: 'BIGINT',
  TextBlob: 'TEXT',
  Blob: 'LONGBLOB',
  AnyBlob: 'LONGBLOB',
  ImageBlob: 'LONGBLOB',
};

const dieselColumnTypesMysql = {
  Boolean: 'Bool',
  Integer: 'Integer',
  Long: 'Bigint',
  Float: 'Float',
  Double: 'Double',
  BigDecimal: 'Numeric',
  String: 'Varchar',
  UUID: 'Varchar',
  LocalDate: 'Date',
  Instant: 'Datetime',
  ZonedDateTime: 'Datetime',
  Duration: 'Bigint',
  TextBlob: 'Text',
  Blob: 'Blob',
  AnyBlob: 'Blob',
  ImageBlob: 'Blob',
};

// MongoDB field type mappings (Rust types for MongoDB/BSON)
const mongoFieldTypes = {
  Boolean: 'bool',
  Integer: 'i32',
  Long: 'i64',
  Float: 'f64',
  Double: 'f64',
  BigDecimal: 'f64', // MongoDB doesn't have native Decimal128 support in Rust driver
  String: 'String',
  UUID: 'String', // Store as string representation
  LocalDate: 'chrono::NaiveDate',
  Instant: 'bson::DateTime',
  ZonedDateTime: 'bson::DateTime',
  Duration: 'i64',
  TextBlob: 'String',
  Blob: 'bson::Binary',
  AnyBlob: 'bson::Binary',
  ImageBlob: 'bson::Binary',
};

// BSON type names for schema documentation/validation
const bsonTypes = {
  Boolean: 'bool',
  Integer: 'int',
  Long: 'long',
  Float: 'double',
  Double: 'double',
  BigDecimal: 'double',
  String: 'string',
  UUID: 'string',
  LocalDate: 'date',
  Instant: 'date',
  ZonedDateTime: 'date',
  Duration: 'long',
  TextBlob: 'string',
  Blob: 'binData',
  AnyBlob: 'binData',
  ImageBlob: 'binData',
};

/**
 * Convert a string to snake_case for Rust module/variable names
 * Handles: PascalCase, camelCase, kebab-case, and space-separated
 * @param {string} str - The string to convert
 * @returns {string} The snake_case version
 */
function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase/PascalCase to snake_case
    .replace(/[\s-]+/g, '_') // spaces and hyphens to underscores
    .toLowerCase();
}

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, queueCommandTasks: true });
    fixBlueprintPackagePath(this);
  }

  async beforeQueue() {
    await this.dependsOnBootstrapApplication();
    // Server bootstrap populates entity properties (persistClass, entityClass,
    // entityTableName, joinTable, otherEntityTableName, etc.) that our entity
    // templates depend on. Without this, those properties are undefined when the
    // rust-server generator is invoked outside the full app composition chain
    // (e.g. via test helpers or with skipClient/clientFramework: 'no').
    await this.dependsOnBootstrap('server');
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializing() {
        this.blueprintConfig.rustVersion = '1.75.0';
      },
    });
  }

  get [BaseApplicationGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      async configuringTemplateTask() {
        // Default to SQLite for Rust development if no database type is specified
        if (!this.jhipsterConfig.devDatabaseType) {
          this.jhipsterConfig.devDatabaseType = 'sqlite';
        }
        // Default to JWT authentication if no authentication type is specified
        if (!this.jhipsterConfig.authenticationType) {
          this.jhipsterConfig.authenticationType = 'jwt';
        }
        // Derive databaseType from devDatabaseType so JHipster correctly generates
        // built-in entities (User, Authority) for the Angular client
        const devDb = this.jhipsterConfig.devDatabaseType;
        if (!this.jhipsterConfig.databaseType && devDb) {
          if (['postgresql', 'mysql', 'mariadb', 'mssql', 'oracle', 'sqlite'].includes(devDb)) {
            this.jhipsterConfig.databaseType = 'sql';
          } else if (devDb === 'mongodb') {
            this.jhipsterConfig.databaseType = 'mongodb';
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {
        await this.composeWithJHipster('docker');
      },
    });
  }

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      async loadingTemplateTask({ application }) {
        // Convert baseName to snake_case for Rust crate naming convention
        application.rustCrateName = toSnakeCase(application.baseName);

        application.rustDependencies = {
          axum: '0.7',
          tokio: '1',
          diesel: '2.1',
          serde: '1',
          serde_json: '1',
          dotenvy: '0.15',
          tracing: '0.1',
          'tracing-subscriber': '0.3',
          thiserror: '1',
          chrono: '0.4',
          uuid: '1',
          argon2: '0.5',
          jsonwebtoken: '9',
          'tower-http': '0.5',
          validator: '0.18',
        };
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      rustDatabaseConfig({ application }) {
        // Set Rust-specific database flags based on our devDatabaseType config
        const devDbType = this.jhipsterConfig.devDatabaseType || 'sqlite';
        application.devDatabaseType = devDbType;
        application.devDatabaseTypeSqlite = devDbType === 'sqlite';
        application.devDatabaseTypePostgresql = devDbType === 'postgresql';
        application.devDatabaseTypeMysql = devDbType === 'mysql';
        application.devDatabaseTypeMongodb = devDbType === 'mongodb';
        // Flag for SQL-based databases (uses Diesel ORM)
        application.devDatabaseTypeSql = !application.devDatabaseTypeMongodb;

        // Track 1-c.0 fix (2026-05-11): default the field-driven feature flags
        // to false at the application level so EJS templates can reference
        // them unconditionally without ReferenceError. PREPARING_EACH_ENTITY_FIELD
        // flips them to true if any entity field warrants it. Initialize here
        // even for MongoDB scaffolds (which won't flip the flag) so all
        // scaffolds have a consistent application shape.
        application.hasBigDecimalFields = false;
      },
      rustAuthConfig({ application }) {
        // Set Rust-specific authentication flags based on authenticationType config
        const authType = this.jhipsterConfig.authenticationType || 'jwt';
        application.authenticationType = authType;
        application.authenticationTypeJwt = authType === 'jwt';
        application.authenticationTypeOauth2 = authType === 'oauth2';
      },
      rustJwtSecretDefault({ application }) {
        // Generate a random JWT_SECRET default at scaffold time.
        // 32 bytes hex-encoded = 256 bits of entropy from Node's CSPRNG.
        // env.ejs references this as <%= jwtSecretDefault %>.
        // Replaces the prior timestamp-based default which was brute-forceable
        // by anyone who knew approximately when the project was scaffolded.
        if (application.authenticationTypeJwt) {
          application.jwtSecretDefault = randomBytes(32).toString('hex');
        }
      },
      rustSwaggerConfig({ application }) {
        // Set Swagger/OpenAPI flag - defaults to true if not specified
        const enableSwagger = this.jhipsterConfig.enableSwaggerCodegen;
        application.enableSwaggerCodegen = enableSwagger !== false;
      },
      rustEmailConfig({ application }) {
        // Set email flag - defaults to false if not specified
        // Email is only supported with JWT authentication (OAuth2 handles user management externally)
        const enableEmail = this.jhipsterConfig.enableEmail || false;
        application.enableEmail = enableEmail && application.authenticationTypeJwt;
      },
      rustApplicationTypeConfig({ application }) {
        // Set application type flag for monolithic vs microservice deployment
        const appType = this.jhipsterConfig.applicationType || 'monolith';
        application.applicationType = appType;
        application.applicationTypeMonolith = appType === 'monolith';
        application.applicationTypeMicroservice = appType === 'microservice';
        application.applicationTypeGateway = appType === 'gateway';

        // Determine if static hosting should be enabled
        // - Monolith: always enabled (serves the SPA UI)
        // - Gateway: always enabled (serves the main UI)
        // - Microservice: only if it has a microfrontend (skipClient is false/undefined and clientFramework is set)
        const skipClient = this.jhipsterConfig.skipClient;
        const clientFramework = this.jhipsterConfig.clientFramework;
        const hasMicrofrontend = !skipClient && clientFramework && clientFramework !== 'no';

        application.enableStaticHosting = application.applicationTypeMonolith || application.applicationTypeGateway || hasMicrofrontend;
      },
      rustServiceDiscoveryConfig({ application }) {
        // Set service discovery flags for microservices architecture
        // Only applicable for gateway and microservice application types
        const serviceDiscoveryType = this.jhipsterConfig.serviceDiscoveryType || 'no';
        const isMicroservicesApp = application.applicationTypeMicroservice || application.applicationTypeGateway;

        application.serviceDiscoveryType = serviceDiscoveryType;
        application.serviceDiscoveryConsul = isMicroservicesApp && serviceDiscoveryType === 'consul';
        application.serviceDiscoveryAny = isMicroservicesApp && serviceDiscoveryType !== 'no';
      },
      rustExternalConfigConfig({ application }) {
        // External config via Consul KV is optional when service discovery is Consul
        // Defaults to true for backward compatibility
        const externalConfig = this.jhipsterConfig.externalConfig;
        application.externalConfig = externalConfig !== false && application.serviceDiscoveryConsul;
      },
      rustMessageBrokerConfig({ application }) {
        // Set message broker flags for Kafka integration
        const messageBroker = this.jhipsterConfig.messageBroker || 'no';
        application.messageBroker = messageBroker;
        application.messageBrokerKafka = messageBroker === 'kafka';
        application.messageBrokerAny = messageBroker !== 'no';
      },
      rustMonitoringConfig({ application }) {
        // Set monitoring flags for Prometheus metrics integration
        const monitoring = this.jhipsterConfig.monitoring || 'no';
        application.monitoring = monitoring;
        application.monitoringPrometheus = monitoring === 'prometheus';
        application.monitoringAny = monitoring !== 'no';
      },
      rustDistributedTracingConfig({ application }) {
        // Set distributed tracing flags for OpenTelemetry integration
        // Only applicable for gateway and microservice application types
        const isMicroservicesApp = application.applicationTypeMicroservice || application.applicationTypeGateway;
        const distributedTracing = this.jhipsterConfig.distributedTracing || 'no';
        application.distributedTracing = isMicroservicesApp ? distributedTracing : 'no';
        application.distributedTracingZipkin = isMicroservicesApp && distributedTracing === 'zipkin';
        application.distributedTracingJaeger = isMicroservicesApp && distributedTracing === 'jaeger';
        application.distributedTracingAny = isMicroservicesApp && distributedTracing !== 'no';
      },
      rustSecretsManagementConfig({ application }) {
        // Set secrets management flags for Vault integration
        const secretsManagement = this.jhipsterConfig.secretsManagement || 'no';
        application.secretsManagement = secretsManagement;
        application.secretsManagementVault = secretsManagement === 'vault' && application.externalConfig;
      },
      rustCircuitBreakerConfig({ application }) {
        // Set circuit breaker flags for resilience in microservices
        // Circuit breaker is applicable for gateway and microservice application types
        const isMicroservicesApp = application.applicationTypeMicroservice || application.applicationTypeGateway;
        const circuitBreaker = this.jhipsterConfig.circuitBreaker;

        // Enable by default for microservices/gateways, unless explicitly disabled
        if (isMicroservicesApp) {
          application.circuitBreakerEnabled = circuitBreaker !== false;
        } else {
          // For monoliths, only enable if explicitly requested
          application.circuitBreakerEnabled = circuitBreaker === true;
        }
      },
      async source({ source }) {
        // Helper to add entity to models/mod.rs
        source.addEntityToRustModels = ({ entityFileName }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/models/mod.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-model',
              contentToAdd: `pub mod ${rustModuleName};
pub use ${rustModuleName}::*;`,
            }),
          );
        };

        // Helper to add entity to handlers/mod.rs
        source.addEntityToRustHandlers = ({ entityFileName }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/handlers/mod.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-handler',
              contentToAdd: `pub mod ${rustModuleName};`,
            }),
          );
        };

        // Helper to add entity to services/mod.rs
        source.addEntityToRustServices = ({ entityFileName }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/services/mod.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-service',
              contentToAdd: `pub mod ${rustModuleName}_service;
pub use ${rustModuleName}_service::*;`,
            }),
          );
        };

        // Helper to add entity to dto/mod.rs
        source.addEntityToRustDto = ({ entityFileName }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/dto/mod.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-dto',
              contentToAdd: `pub mod ${rustModuleName}_dto;
pub use ${rustModuleName}_dto::*;`,
            }),
          );
        };

        // Helper to add entity routes to main.rs
        // Note: Routes are added inside api_routes() which is already nested under /api,
        // so we only use the entityApiUrl without the /api prefix
        source.addEntityRoutesToMain = ({ entityFileName, entityApiUrl }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/main.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-route',
              contentToAdd: `.nest("/${entityApiUrl}", handlers::${rustModuleName}::routes())`,
            }),
          );
        };

        // Helper to add entity to OpenAPI paths
        source.addEntityToOpenApiPaths = ({ entityFileName }) => {
          const rustModuleName = toSnakeCase(entityFileName);
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/openapi.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-openapi-path',
              contentToAdd: `handlers::${rustModuleName}::get_all,
        handlers::${rustModuleName}::get_one,
        handlers::${rustModuleName}::create,
        handlers::${rustModuleName}::update,
        handlers::${rustModuleName}::remove,`,
            }),
          );
        };

        // Helper to add entity DTO schemas to OpenAPI
        source.addEntityToOpenApiSchemas = ({ entityClass }) => {
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/openapi.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-openapi-schema',
              contentToAdd: `${entityClass}Dto,
            Create${entityClass}Dto,
            Update${entityClass}Dto,`,
            }),
          );
        };

        // Helper to add entity tag to OpenAPI
        // Track 1-c.2 fix (2026-05-11): inject a `diesel::table!` block per
        // JDL-declared entity at the schema.rs needle, plus add the entity
        // table to the allow_tables_to_appear_in_same_query! list. Mirrors the
        // SQL migration column layout: id PK, JDL fields, ManyToOne FK columns,
        // and audit columns (gated on JDL declaration like the model/DTO
        // templates). For MongoDB scaffolds this is a no-op — Mongo doesn't
        // use a Diesel schema.
        source.addEntityToRustSchema = ({ entity, application }) => {
          if (application.devDatabaseTypeMongodb) return;

          const isPg = application.devDatabaseTypePostgresql;
          const isMysql = application.devDatabaseTypeMysql;
          // Postgres uses Int4 for serial IDs; sqlite/mysql use Integer/Bigint.
          const idType = isPg ? 'Int4' : isMysql ? 'Integer' : 'Integer';
          const varcharType = isPg ? 'Varchar' : 'Text';

          const hasField = name => entity.fields.some(f => f.fieldName === name);

          const fieldLines = entity.fields
            .filter(f => !f.id)
            .map(f => {
              const t = f.dieselColumnType || 'Text';
              const wrapped = f.fieldValidationRequired ? t : `Nullable<${t}>`;
              return `        ${f.fieldNameUnderscored} -> ${wrapped},`;
            });

          const relLines = (entity.relationships || [])
            .filter(r => r.relationshipType === 'many-to-one' || (r.relationshipType === 'one-to-one' && r.ownerSide))
            .map(r => `        ${r.relationshipFieldName}_id -> Nullable<${idType}>,`);

          const auditLines = [];
          if (!hasField('createdBy')) auditLines.push(`        created_by -> Nullable<${varcharType}>,`);
          if (!hasField('createdDate')) auditLines.push('        created_date -> Nullable<Timestamp>,');
          if (!hasField('lastModifiedBy')) auditLines.push(`        last_modified_by -> Nullable<${varcharType}>,`);
          if (!hasField('lastModifiedDate')) auditLines.push('        last_modified_date -> Nullable<Timestamp>,');

          const allLines = [...fieldLines, ...relLines, ...auditLines].join('\n');
          const block = `diesel::table! {
    ${entity.entityTableName} (id) {
        id -> ${idType},
${allLines}
    }
}`;

          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/db/schema.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-schema',
              contentToAdd: block,
            }),
          );
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/db/schema.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-allow-table',
              contentToAdd: `    ${entity.entityTableName},`,
            }),
          );
        };

        // Track 1-c.2 fix (2026-05-11): inject a `diesel::table!` block for a
        // ManyToMany join table. Join tables have a composite primary key
        // (entity_id, other_entity_id) and no audit columns.
        source.addJoinTableToRustSchema = ({ joinTableName, entityTableName, otherEntityTableName, application }) => {
          if (application.devDatabaseTypeMongodb) return;
          const isPg = application.devDatabaseTypePostgresql;
          const idType = isPg ? 'Int4' : 'Integer';
          const block = `diesel::table! {
    ${joinTableName} (${entityTableName}_id, ${otherEntityTableName}_id) {
        ${entityTableName}_id -> ${idType},
        ${otherEntityTableName}_id -> ${idType},
    }
}`;
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/db/schema.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-entity-schema',
              contentToAdd: block,
            }),
          );
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/db/schema.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-allow-table',
              contentToAdd: `    ${joinTableName},`,
            }),
          );
        };

        source.addEntityToOpenApiTags = ({ entityApiUrl, entityClass }) => {
          this.editFile(
            `${SERVER_RUST_SRC_DIR}/src/openapi.rs`,
            createNeedleCallback({
              needle: 'jhipster-needle-add-openapi-tag',
              contentToAdd: `(name = "${entityApiUrl}", description = "${entityClass} management endpoints"),`,
            }),
          );
        };
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY]() {
    return this.asPreparingEachEntityTaskGroup({
      async preparingEachEntityTask({ application, entity }) {
        // Bug #17 fix (1-a.5.1): upstream's configureEntityTable only prefixes
        // `jhi_` when isReservedTableName(name, prodDatabaseType) returns true.
        // That call uses a per-DB lookup that has MYSQL/POSTGRESQL/ORACLE/MSSQL
        // word lists but NO sqlite list — so on sqlite scaffolds, reserved
        // words like `order` slip through and the generated migration emits
        // `CREATE TABLE order (...)` which fails with a syntax error.
        //
        // We re-check the table name against the postgres reserved list (which
        // covers `order`, `user`, `group`, etc. — a superset of practical
        // collisions). If upstream missed it (postgres scaffolds already got
        // the prefix; only sqlite/h2 reach here without one), prefix `jhi_`.
        if (!entity.entityTableName || !application.jhiTablePrefix) return;
        if (entity.entityTableName.startsWith(`${application.jhiTablePrefix}_`)) return;
        if (isReservedPostgresqlKeyword(entity.entityTableName)) {
          entity.entityTableName = `${application.jhiTablePrefix}_${entity.entityTableName}`;
        }
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_RELATIONSHIP]() {
    return this.asPreparingEachEntityRelationshipTaskGroup({
      async preparingEachEntityRelationshipTask({ entity, relationship }) {
        backfillRelationshipForRust(entity, relationship);
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTask({ application, field }) {
        const { fieldType } = field;
        if (field.skipServer) return;

        // Track 1-c.0 fix (2026-05-11): set application-level flag when ANY
        // entity field is BigDecimal on a SQL database scaffold. Cargo.toml
        // templates condition the `bigdecimal` crate dep and diesel's
        // `numeric` feature on this flag. MongoDB scaffolds map BigDecimal to
        // f64 (no bigdecimal crate needed) so the flag is SQL-only.
        if (fieldType === 'BigDecimal' && !application.devDatabaseTypeMongodb) {
          application.hasBigDecimalFields = true;
        }

        field.rustFieldType = rustFieldTypes[fieldType] ?? 'String';

        // MongoDB-specific field types
        if (application.devDatabaseTypeMongodb) {
          field.mongoFieldType = mongoFieldTypes[fieldType] ?? 'String';
          field.bsonType = bsonTypes[fieldType] ?? 'string';
          // Handle nullable fields for MongoDB
          if (!field.fieldValidationRequired) {
            field.mongoFieldType = `Option<${field.mongoFieldType}>`;
          }
        } else {
          // Use database-specific column types for SQL databases
          if (application.devDatabaseTypePostgresql) {
            field.dieselColumnType = dieselColumnTypesPostgres[fieldType] ?? 'Varchar';
            field.sqlColumnType = postgresColumnTypes[fieldType] ?? 'VARCHAR(255)';
          } else if (application.devDatabaseTypeMysql) {
            field.dieselColumnType = dieselColumnTypesMysql[fieldType] ?? 'Varchar';
            field.sqlColumnType = mysqlColumnTypes[fieldType] ?? 'VARCHAR(255)';
          } else {
            field.dieselColumnType = dieselColumnTypes[fieldType] ?? 'Text';
            field.sqlColumnType = sqliteColumnTypes[fieldType] ?? 'TEXT';
          }
          // Keep database-specific column types for template backwards compatibility
          field.sqliteColumnType = sqliteColumnTypes[fieldType] ?? 'TEXT';
          field.postgresColumnType = postgresColumnTypes[fieldType] ?? 'VARCHAR(255)';
          field.mysqlColumnType = mysqlColumnTypes[fieldType] ?? 'VARCHAR(255)';
        }

        // Handle nullable fields
        if (!field.fieldValidationRequired) {
          field.rustFieldType = `Option<${field.rustFieldType}>`;
        }
      },
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: serverFiles,
          context: application,
        });
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async patchRibbonTranslations({ application }) {
        // The JHipster Angular PageRibbonComponent has a bug where the ribbon always renders
        // (checks Signal object truthiness instead of Signal value). When the profile is not "dev",
        // it tries to translate "global.ribbon.<profile>" which doesn't exist → "translation-not-found".
        // Fix: add missing ribbon translations for common profiles.
        if (application.skipClient) return;

        const languages = application.languages || ['en'];
        for (const lang of languages) {
          const globalJsonPath = `client/src/i18n/${lang}/global.json`;
          if (this.existsDestination(globalJsonPath)) {
            this.editFile(globalJsonPath, content => {
              try {
                const json = JSON.parse(content);
                if (json.global?.ribbon) {
                  // Add translations for common profiles if missing
                  if (!json.global.ribbon.prod) {
                    json.global.ribbon.prod = 'Production';
                  }
                  if (!json.global.ribbon.staging) {
                    json.global.ribbon.staging = 'Staging';
                  }
                }
                return `${JSON.stringify(json, null, 2)}\n`;
              } catch {
                return content;
              }
            });
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {
        if (application.devDatabaseTypeMongodb) {
          // MongoDB has no SQL migrations; only generate the entity files via writeFiles below.
        }
        const entityList = entities.filter(entity => !entity.skipServer && !entity.builtIn);

        // Track 1 Phase 0 sub-task 3 follow-up (2026-05-11): topologically sort entities
        // by FK dependency before assigning migration timestamps. diesel applies migrations
        // in lexicographic timestamp order, so an entity that references another via a
        // many-to-one or owning one-to-one relationship MUST have a timestamp strictly
        // greater than the referenced entity's, otherwise `CREATE TABLE child` runs before
        // `CREATE TABLE parent` and fails with `relation "parent" does not exist`.
        //
        // We still prefer each entity's own `changelogDate` when it already sorts after
        // its dependencies (preserves migration filename stability across regenerations,
        // which the original code was solving for). Only when changelogDate is too early
        // do we bump it forward past the latest dependency timestamp.
        const entityByName = new Map();
        for (const e of entityList) {
          // Index by the canonical capitalized name used in relationship metadata.
          const key = e.entityNameCapitalized || e.name;
          if (key) entityByName.set(key, e);
        }
        const fkDeps = entity => {
          // Owning-side FK columns are emitted by both up.sql.ejs and schema.rs.ejs,
          // so the matching parent table must exist first.
          return (entity.relationships || [])
            .filter(r => r.relationshipType === 'many-to-one' || (r.relationshipType === 'one-to-one' && r.ownerSide))
            .map(r => entityByName.get(r.otherEntityNameCapitalized) || entityByName.get(r.otherEntity?.name))
            .filter(dep => dep && dep !== entity);
        };
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = entity => {
          if (visited.has(entity)) return;
          if (visiting.has(entity)) return; // Cycle — fall back to insertion order for that arc.
          visiting.add(entity);
          for (const dep of fkDeps(entity)) visit(dep);
          visiting.delete(entity);
          visited.add(entity);
          sorted.push(entity);
        };
        for (const entity of entityList) visit(entity);

        const assignedTimestamp = new Map();

        // Track 1-a.3 fix (2026-06-07): seed the collision-avoidance set with
        // EXISTING migration timestamp prefixes on disk. Without this, when
        // `jhipster jdl <fixture>` adds entities to a scaffold that already
        // has migrations (e.g. customer/order from the initial JDL), the new
        // entity's changelogDate can land on the exact same YYYYMMDDHHMMSS
        // prefix as an existing migration. Diesel keys migration identity by
        // the timestamp VERSION prefix, so the colliding migration gets
        // silently treated as already-applied — and any later migration that
        // FKs into the "applied" table fails with `relation "X" does not exist`.
        //
        // Two existing migrations live under .../create_<entityTableName>;
        // capture them by table name so a regeneration of the SAME entity
        // can preserve its stable filename via the changelogDate-vs-deps
        // branch below.
        const existingByEntityTable = new Map(); // entityTableName -> timestamp
        const allExistingPrefixes = new Set(); // every timestamp prefix in migrations/
        const migrationsDirPath = this.destinationPath('migrations');
        if (existsSync(migrationsDirPath)) {
          for (const dirName of readdirSync(migrationsDirPath)) {
            const m = dirName.match(/^(\d+)_create_(.+)$/);
            if (!m) continue; // skip 00000000000000_diesel_initial_setup etc.
            allExistingPrefixes.add(m[1]);
            existingByEntityTable.set(m[2], m[1]);
          }
        }

        // First pass: write the entity source files and their CREATE TABLE migrations.
        for (const entity of sorted) {
          let maxDepTimestamp = '0';
          for (const dep of fkDeps(entity)) {
            const depTs = assignedTimestamp.get(dep);
            if (depTs && depTs > maxDepTimestamp) maxDepTimestamp = depTs;
          }
          // Prefer entity.changelogDate when it already sorts after every dependency,
          // so regenerations keep stable migration filenames. Otherwise bump past
          // the latest dependency timestamp.
          let candidate = entity.changelogDate > maxDepTimestamp ? entity.changelogDate : bumpMigrationTimestamp(maxDepTimestamp, 1);
          // Track 1-a.3: avoid colliding with any OTHER migration's prefix on
          // disk. The candidate is OK if (a) no existing prefix matches, OR
          // (b) the existing match is THIS entity's prior migration
          // (regeneration — preserve the stable filename).
          const myExisting = existingByEntityTable.get(entity.entityTableName);
          while (allExistingPrefixes.has(candidate) && candidate !== myExisting) {
            candidate = bumpMigrationTimestamp(candidate, 1);
          }
          // Add the chosen timestamp to the set so SAME-batch siblings bump
          // past it too (within this loop they're picked up via
          // assignedTimestamp / fkDeps, but no-dependency entities like
          // Tag won't see it any other way).
          allExistingPrefixes.add(candidate);
          entity.migrationTimestamp = candidate;
          assignedTimestamp.set(entity, entity.migrationTimestamp);

          await this.writeFiles({
            sections: entityFiles,
            context: { ...application, ...entity },
          });

          if (application.devDatabaseTypeMongodb) continue;

          // Generate entity migration only if it doesn't already exist
          const migrationDir = `migrations/${entity.migrationTimestamp}_create_${entity.entityTableName}`;
          const migrationUpPath = `${migrationDir}/up.sql`;

          // Check if migration already exists
          if (!this.existsDestination(migrationUpPath)) {
            await this.writeFile(this.templatePath('migrations/entity/up.sql.ejs'), migrationUpPath, { ...application, ...entity });
            await this.writeFile(this.templatePath('migrations/entity/down.sql.ejs'), `${migrationDir}/down.sql`, {
              ...application,
              ...entity,
            });
          } else {
            this.log.info(`Migration for ${entity.entityClass} already exists, skipping...`);
          }
        }

        if (application.devDatabaseTypeMongodb) return;

        // Second pass: write join-table migrations for many-to-many relationships.
        // These must run AFTER all entity CREATE TABLE migrations because the join
        // table FKs reference both endpoint tables. We give them timestamps strictly
        // greater than the maximum entity changelogDate so the diesel CLI applies
        // them last regardless of how the entity timestamps interleave.
        const maxEntityTimestamp = entityList.reduce(
          (max, entity) => (entity.migrationTimestamp > max ? entity.migrationTimestamp : max),
          '0',
        );
        let joinTableCounter = 0;
        for (const entity of entityList) {
          const m2mRelationships = (entity.relationships || []).filter(
            r => r.relationshipType === 'many-to-many' && r.relationshipLeftSide,
          );
          for (const rel of m2mRelationships) {
            if (!rel.joinTable?.name) continue;
            joinTableCounter += 1;
            const joinTimestamp = bumpMigrationTimestamp(maxEntityTimestamp, joinTableCounter);
            const joinDir = `migrations/${joinTimestamp}_create_${rel.joinTable.name}`;
            const joinUpPath = `${joinDir}/up.sql`;
            if (this.existsDestination(joinUpPath)) continue;
            const joinContext = {
              ...application,
              entityTableName: entity.entityTableName,
              otherEntityTableName: rel.otherEntityTableName || rel.otherEntity?.entityTableName,
              joinTableName: rel.joinTable.name,
            };
            await this.writeFile(this.templatePath('migrations/join_table/up.sql.ejs'), joinUpPath, joinContext);
            await this.writeFile(this.templatePath('migrations/join_table/down.sql.ejs'), `${joinDir}/down.sql`, joinContext);
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application, entities, source }) {
        for (const entity of entities.filter(entity => !entity.skipServer && !entity.builtIn)) {
          // entityFileName is set by JHipster's *client* generator, so it is undefined
          // when no client framework is selected. Resolve a snake_case file name from
          // a property that is always populated by base entity preparation.
          const entityFileName = rustEntityFileName(entity);
          const { entityApiUrl, entityClass } = entity;

          source.addEntityToRustModels({ entityFileName });
          source.addEntityToRustHandlers({ entityFileName });
          source.addEntityToRustServices({ entityFileName });
          source.addEntityToRustDto({ entityFileName });
          source.addEntityRoutesToMain({ entityFileName, entityApiUrl });

          // Track 1-c.2 fix (2026-05-11): inject the entity's diesel::table!
          // block into schema.rs so handlers/services can `use crate::db::schema::<entity>`.
          source.addEntityToRustSchema({ entity, application });

          // Add entity to OpenAPI documentation (only if Swagger is enabled)
          if (application.enableSwaggerCodegen) {
            source.addEntityToOpenApiPaths({ entityFileName });
            source.addEntityToOpenApiSchemas({ entityClass });
            source.addEntityToOpenApiTags({ entityApiUrl, entityClass });
          }
        }

        // Track 1-c.2 fix (2026-05-11): emit join-table schemas for every
        // ManyToMany relationship across the entity set. Mirror the migration
        // generation pattern (the existing WRITING_ENTITIES `Second pass`)
        // which only emits join tables on the "left" side to avoid duplicates.
        for (const entity of entities.filter(e => !e.skipServer && !e.builtIn)) {
          const m2mRelationships = (entity.relationships || []).filter(
            r => r.relationshipType === 'many-to-many' && r.relationshipLeftSide,
          );
          for (const rel of m2mRelationships) {
            if (!rel.joinTable?.name) continue;
            source.addJoinTableToRustSchema({
              joinTableName: rel.joinTable.name,
              entityTableName: entity.entityTableName,
              otherEntityTableName: rel.otherEntityTableName || rel.otherEntity?.entityTableName,
              application,
            });
          }
        }
      },
    });
  }

  get [BaseApplicationGenerator.END]() {
    return this.asEndTaskGroup({
      async runRustDieselMigrations({ application }) {
        // Skip for MongoDB - it doesn't use diesel migrations.
        if (application.devDatabaseTypeMongodb) return;
        runDieselMigrations(this);
      },
    });
  }
}
