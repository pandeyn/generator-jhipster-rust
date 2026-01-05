import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import EntityGenerator from 'generator-jhipster/generators/entity';
import { entityFiles } from '../rust-server/files.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RUST_SERVER_TEMPLATES_PATH = join(__dirname, '../rust-server/templates');

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

export default class extends EntityGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      checkBlueprint: true,
      jhipster7Migration: true,
    });
  }

  async beforeQueue() {
    await super.beforeQueue();
  }

  get [EntityGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      ...super.initializing,
      async initializingTemplateTask() {},
    });
  }

  get [EntityGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      ...super.prompting,
      async promptingTemplateTask() {},
    });
  }

  get [EntityGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      ...super.configuring,
      async configuringTemplateTask() {},
    });
  }

  get [EntityGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      ...super.composing,
      async composingTemplateTask() {},
    });
  }

  get [EntityGenerator.COMPOSING_COMPONENT]() {
    return this.asComposingComponentTaskGroup({
      ...super.composingComponent,
      async composingComponentTemplateTask() {},
    });
  }

  get [EntityGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      ...super.loading,
      async loadingTemplateTask() {},
    });
  }

  get [EntityGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      ...super.preparing,
      async preparingTemplateTask() {},
    });
  }

  get [EntityGenerator.POST_PREPARING]() {
    return this.asPostPreparingTaskGroup({
      ...super.postPreparing,
    });
  }

  get [EntityGenerator.CONFIGURING_EACH_ENTITY]() {
    return this.asConfiguringEachEntityTaskGroup({
      ...super.configuringEachEntity,
      async configuringEachEntityTemplateTask() {},
    });
  }

  get [EntityGenerator.LOADING_ENTITIES]() {
    return this.asLoadingEntitiesTaskGroup({
      ...super.loadingEntities,
      async loadingEntitiesTemplateTask() {},
    });
  }

  get [EntityGenerator.PREPARING_EACH_ENTITY]() {
    return this.asPreparingEachEntityTaskGroup({
      ...super.preparingEachEntity,
      async preparingEachEntityTemplateTask() {},
    });
  }

  get [EntityGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      ...super.preparingEachEntityField,
      async preparingEachEntityFieldTask({ field }) {
        const { fieldType } = field;
        if (field.skipServer) return;

        // Map JHipster field types to Rust types
        field.rustFieldType = rustFieldTypes[fieldType] ?? 'String';
        field.dieselColumnType = dieselColumnTypes[fieldType] ?? 'Text';
        field.sqliteColumnType = sqliteColumnTypes[fieldType] ?? 'TEXT';

        // Handle nullable fields
        if (!field.fieldValidationRequired) {
          field.rustFieldType = `Option<${field.rustFieldType}>`;
        }
      },
    });
  }

  get [EntityGenerator.PREPARING_EACH_ENTITY_RELATIONSHIP]() {
    return this.asPreparingEachEntityRelationshipTaskGroup({
      ...super.preparingEachEntityRelationship,
      async preparingEachEntityRelationshipTemplateTask({ relationship }) {
        // Fix join table naming to use single underscore instead of double underscore
        // This avoids Rust's snake_case warning for module names like "rel_store__product"
        if (relationship.joinTable && relationship.joinTable.name) {
          relationship.joinTable.name = relationship.joinTable.name.replace('__', '_');
        }
      },
    });
  }

  get [EntityGenerator.POST_PREPARING_EACH_ENTITY]() {
    return this.asPostPreparingEachEntityTaskGroup({
      ...super.postPreparingEachEntity,
      async postPreparingEachEntityTemplateTask() {},
    });
  }

  get [EntityGenerator.DEFAULT]() {
    return this.asDefaultTaskGroup({
      ...super.default,
      async defaultTemplateTask() {},
    });
  }

  get [EntityGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask() {
        // Skip default writing - handled in WRITING_ENTITIES
      },
    });
  }

  get [EntityGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTask({ application, entities }) {
        for (const entity of entities.filter(e => !e.skipServer && !e.builtIn)) {
          // Write entity files (model, handler, service, dto)
          await this.writeFiles({
            sections: entityFiles,
            context: { ...application, ...entity },
            rootTemplatesPath: RUST_SERVER_TEMPLATES_PATH,
          });

          // Check if a migration for this entity already exists
          const migrationsDir = join(this.destinationPath(), 'migrations');
          let migrationExists = false;

          if (existsSync(migrationsDir)) {
            const existingMigrations = readdirSync(migrationsDir);
            migrationExists = existingMigrations.some(m => m.includes(`_create_${entity.entityTableName}`));
          }

          // Only generate migration if it doesn't exist
          if (!migrationExists) {
            // Use entity's changelogDate for migration timestamp to ensure consistency
            // This prevents duplicate migrations when regenerating entities
            entity.migrationTimestamp = entity.changelogDate;

            const migrationDir = `migrations/${entity.migrationTimestamp}_create_${entity.entityTableName}`;
            await this.writeFile(join(RUST_SERVER_TEMPLATES_PATH, 'migrations/entity/up.sql.ejs'), `${migrationDir}/up.sql`, {
              ...application,
              ...entity,
            });
            await this.writeFile(join(RUST_SERVER_TEMPLATES_PATH, 'migrations/entity/down.sql.ejs'), `${migrationDir}/down.sql`, {
              ...application,
              ...entity,
            });
            this.log.info(`Created migration for ${entity.entityClass}`);
          } else {
            this.log.info(`Migration for ${entity.entityClass} already exists, skipping...`);
          }
        }
      },
    });
  }

  get [EntityGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      ...super.postWriting,
      async postWritingTemplateTask() {},
    });
  }

  get [EntityGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTask({ entities: _entities }) {
        // Note: Adding entities to mod.rs files and main.rs routes is handled by
        // the rust-server generator's POST_WRITING_ENTITIES phase via source helpers.
        // The schema.rs is auto-generated by Diesel CLI when migrations run.
      },
    });
  }

  get [EntityGenerator.LOADING_TRANSLATIONS]() {
    return this.asLoadingTranslationsTaskGroup({
      ...super.loadingTranslations,
      async loadingTranslationsTemplateTask() {},
    });
  }

  get [EntityGenerator.INSTALL]() {
    return this.asInstallTaskGroup({
      ...super.install,
      async installTemplateTask() {},
    });
  }

  get [EntityGenerator.POST_INSTALL]() {
    return this.asPostInstallTaskGroup({
      ...super.postInstall,
      async postInstallTemplateTask() {},
    });
  }

  get [EntityGenerator.END]() {
    return this.asEndTaskGroup({
      ...super.end,
      async runDieselMigrations() {
        // Run diesel migrations to update schema.rs after entity creation
        // This ensures the schema includes the new entity table
        const migrationsDir = this.destinationPath('migrations');
        if (existsSync(migrationsDir)) {
          this.log.info('Running diesel migrations to update schema.rs...');
          try {
            // Ensure the database directory exists
            const dbDir = this.destinationPath('target/db');
            if (!existsSync(dbDir)) {
              const { mkdirSync } = await import('node:fs');
              mkdirSync(dbDir, { recursive: true });
            }

            const { spawnSync } = await import('node:child_process');
            const result = spawnSync('diesel', ['migration', 'run'], {
              cwd: this.destinationPath(),
              stdio: 'pipe',
              encoding: 'utf-8',
            });

            if (result.status === 0) {
              this.log.ok('Diesel migrations completed successfully. schema.rs has been updated.');
            } else {
              this.log.warn('Diesel migration failed. You may need to run "diesel migration run" manually.');
              if (result.stderr) {
                this.log.warn(result.stderr);
              }
            }
          } catch (error) {
            this.log.warn('Could not run diesel migrations automatically. Please run "diesel migration run" manually.');
            this.log.warn(error.message);
          }
        }
      },
    });
  }
}
