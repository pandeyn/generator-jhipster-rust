import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import EntityGenerator from 'generator-jhipster/generators/entity';

import {
  backfillRelationshipForRust,
  bumpMigrationTimestamp,
  fixBlueprintPackagePath,
  runDieselMigrations,
} from '../generator-rust-constants.js';
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

/**
 * Convert a string to snake_case.
 */
function toSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Check whether a column has already been created or added by any prior migration
 * for the given entity table. Used to avoid emitting duplicate ALTER TABLE migrations
 * when an existing entity is regenerated.
 */
function columnExistsInMigrations(migrationsDir, entityTableName, columnName) {
  if (!existsSync(migrationsDir)) return false;
  const migrationDirs = readdirSync(migrationsDir);
  // Match the column as a whole word followed by whitespace (column definition)
  const columnRegex = new RegExp(`\\b${columnName}\\b\\s+`);
  for (const dir of migrationDirs) {
    const upPath = join(migrationsDir, dir, 'up.sql');
    if (!existsSync(upPath)) continue;
    const sql = readFileSync(upPath, 'utf8');
    if (!sql.toLowerCase().includes(entityTableName.toLowerCase())) continue;
    if (columnRegex.test(sql)) return true;
  }
  return false;
}

/**
 * Generate a migration timestamp using the current time. The counter parameter is
 * appended (modulo seconds) so multiple ALTER migrations created in a single run
 * are guaranteed to sort after each other and after the entity's create migration.
 */
function nextAlterMigrationTimestamp(counter) {
  const now = new Date(Date.now() + counter * 1000);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return (
    `${now.getUTCFullYear()}` +
    `${pad(now.getUTCMonth() + 1)}` +
    `${pad(now.getUTCDate())}` +
    `${pad(now.getUTCHours())}` +
    `${pad(now.getUTCMinutes())}` +
    `${pad(now.getUTCSeconds())}`
  );
}

export default class extends EntityGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      checkBlueprint: true,
      jhipster7Migration: true,
    });
    fixBlueprintPackagePath(this);
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
      async preparingEachEntityRelationshipTemplateTask({ entity, relationship }) {
        // Backfill the relationship properties our Rust templates depend on but
        // that JHipster's server bootstrap may leave unset (joinTable for MongoDB
        // many-to-many, otherEntityTableName when server bootstrap doesn't run).
        backfillRelationshipForRust(entity, relationship);
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
        const migrationsDir = join(this.destinationPath(), 'migrations');
        // Counter to keep ALTER migration timestamps unique across one generator run
        let alterMigrationCounter = 0;

        for (const entity of entities.filter(e => !e.skipServer && !e.builtIn)) {
          // Write entity files (model, handler, service, dto)
          await this.writeFiles({
            sections: entityFiles,
            context: { ...application, ...entity },
            rootTemplatesPath: RUST_SERVER_TEMPLATES_PATH,
          });

          // Check if a create migration for this entity already exists
          let migrationExists = false;
          if (existsSync(migrationsDir)) {
            const existingMigrations = readdirSync(migrationsDir);
            migrationExists = existingMigrations.some(m => m.includes(`_create_${entity.entityTableName}`));
          }

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

            // For existing entities, detect new foreign-key columns introduced by new
            // many-to-one or owner-side one-to-one relationships (typically created as
            // back-references when a new entity is added) and emit ALTER TABLE migrations
            // for any columns that are not yet present in any existing migration.
            const fkRelationships = (entity.relationships || []).filter(
              r => r.relationshipType === 'many-to-one' || (r.relationshipType === 'one-to-one' && r.relationshipLeftSide),
            );
            for (const rel of fkRelationships) {
              const columnName = `${toSnakeCase(rel.relationshipName)}_id`;
              const otherEntityTableName = rel.otherEntityTableName || rel.otherEntity?.entityTableName;
              if (!otherEntityTableName) continue;
              if (columnExistsInMigrations(migrationsDir, entity.entityTableName, columnName)) continue;

              alterMigrationCounter += 1;
              const alterTimestamp = nextAlterMigrationTimestamp(alterMigrationCounter);
              const alterDir = `migrations/${alterTimestamp}_alter_${entity.entityTableName}_add_${columnName}`;
              const context = {
                entityTableName: entity.entityTableName,
                columnName,
                otherEntityTableName,
                relationshipName: rel.relationshipName,
              };
              await this.writeFile(
                join(RUST_SERVER_TEMPLATES_PATH, 'migrations/alter_add_column/up.sql.ejs'),
                `${alterDir}/up.sql`,
                context,
              );
              await this.writeFile(
                join(RUST_SERVER_TEMPLATES_PATH, 'migrations/alter_add_column/down.sql.ejs'),
                `${alterDir}/down.sql`,
                context,
              );
              this.log.info(`Created alter migration to add ${columnName} to ${entity.entityTableName}`);
            }
          }
        }

        if (application.devDatabaseTypeMongodb) return;

        // Write join-table migrations for many-to-many relationships in a separate
        // migration file with a timestamp strictly greater than every entity's
        // changelogDate. The join table FKs reference both endpoint tables, so the
        // join migration must run AFTER both entity tables exist (otherwise strict
        // FK enforcement on Postgres/MySQL rejects it).
        const entityList = entities.filter(e => !e.skipServer && !e.builtIn);
        const maxEntityTimestamp = entityList.reduce(
          (max, e) => ((e.migrationTimestamp || e.changelogDate || '0') > max ? e.migrationTimestamp || e.changelogDate : max),
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
            // Skip if a join-table migration for this relationship already exists.
            const existingJoinMigration =
              existsSync(migrationsDir) && readdirSync(migrationsDir).some(m => m.endsWith(`_create_${rel.joinTable.name}`));
            if (existingJoinMigration) continue;
            const joinContext = {
              ...application,
              entityTableName: entity.entityTableName,
              otherEntityTableName: rel.otherEntityTableName || rel.otherEntity?.entityTableName,
              joinTableName: rel.joinTable.name,
            };
            await this.writeFile(join(RUST_SERVER_TEMPLATES_PATH, 'migrations/join_table/up.sql.ejs'), joinUpPath, joinContext);
            await this.writeFile(
              join(RUST_SERVER_TEMPLATES_PATH, 'migrations/join_table/down.sql.ejs'),
              `${joinDir}/down.sql`,
              joinContext,
            );
            this.log.info(`Created join-table migration ${rel.joinTable.name}`);
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
      async runRustDieselMigrations({ application }) {
        // Skip for MongoDB - it doesn't use diesel migrations.
        if (application?.devDatabaseTypeMongodb) return;
        runDieselMigrations(this);
      },
    });
  }
}
