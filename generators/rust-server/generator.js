import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { createNeedleCallback } from 'generator-jhipster/generators/base/support';
import { SERVER_RUST_SRC_DIR } from '../generator-rust-constants.js';
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
  }

  async beforeQueue() {
    await this.dependsOnJHipster('bootstrap-application');
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
      },
      rustAuthConfig({ application }) {
        // Set Rust-specific authentication flags based on authenticationType config
        const authType = this.jhipsterConfig.authenticationType || 'jwt';
        application.authenticationType = authType;
        application.authenticationTypeJwt = authType === 'jwt';
        application.authenticationTypeOauth2 = authType === 'oauth2';
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
        // Monolithic apps can serve static UI files from the Rust backend
        const appType = this.jhipsterConfig.applicationType || 'monolith';
        application.applicationType = appType;
        application.applicationTypeMonolith = appType === 'monolith';
        application.applicationTypeMicroservice = appType === 'microservice';
        application.applicationTypeGateway = appType === 'gateway';
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

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTask({ application, field }) {
        const { fieldType } = field;
        if (field.skipServer) return;

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

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {
        for (const entity of entities.filter(entity => !entity.skipServer && !entity.builtIn)) {
          // Use entity's changelogDate for migration timestamp to ensure consistency across regenerations
          // This prevents duplicate migrations when regenerating entities
          entity.migrationTimestamp = entity.changelogDate;

          await this.writeFiles({
            sections: entityFiles,
            context: { ...application, ...entity },
          });

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
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application, entities, source }) {
        for (const entity of entities.filter(entity => !entity.skipServer && !entity.builtIn)) {
          const { entityFileName, entityApiUrl, entityClass } = entity;

          source.addEntityToRustModels({ entityFileName });
          source.addEntityToRustHandlers({ entityFileName });
          source.addEntityToRustServices({ entityFileName });
          source.addEntityToRustDto({ entityFileName });
          source.addEntityRoutesToMain({ entityFileName, entityApiUrl });

          // Add entity to OpenAPI documentation (only if Swagger is enabled)
          if (application.enableSwaggerCodegen) {
            source.addEntityToOpenApiPaths({ entityFileName });
            source.addEntityToOpenApiSchemas({ entityClass });
            source.addEntityToOpenApiTags({ entityApiUrl, entityClass });
          }
        }
      },
    });
  }
}
