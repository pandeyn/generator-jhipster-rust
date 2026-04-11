import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const SERVER_RUST_SRC_DIR = 'server';
export const SERVER_RUST_MIGRATIONS_DIR = 'migrations';

/**
 * Fix _meta.packagePath for blueprint version detection.
 * Yeoman sets _meta.packagePath to the package directory, but JHipster's
 * storeBlueprintVersion feature expects it to be the package.json file path.
 * Must be called in the constructor after super() to prepend before JHipster's handler.
 */
export function fixBlueprintPackagePath(generator) {
  generator.prependOnceListener('before:queueOwnTasks', () => {
    if (generator._meta?.packagePath && !generator._meta.packagePath.endsWith('package.json')) {
      generator._meta.packagePath = join(generator._meta.packagePath, 'package.json');
    }
  });
}

/**
 * Resolve the snake_case file/module name for a Rust entity. Prefers JHipster's
 * standard `entityNameKebabCase` (always populated by base entity preparation),
 * then falls back to client-derived `entityFileName`, then to `entityInstance`/`name`.
 * Depending on `entityFileName` alone breaks when the client generator does not run
 * (e.g. `clientFramework: 'no'` or `skipClient: true`).
 */
export function rustEntityFileName(entity) {
  const source = entity.entityNameKebabCase || entity.entityFileName || entity.entityInstance || entity.name;
  if (!source) return source;
  return source
    .replace(/-/g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Bump a 14-digit `YYYYMMDDHHmmss` migration timestamp by `seconds` seconds while
 * preserving the same format. Used to mint deterministic timestamps for derived
 * migrations (such as M:M join-table migrations) that must sort after the entity
 * migrations they depend on.
 */
export function bumpMigrationTimestamp(timestamp, seconds) {
  if (!timestamp || timestamp === '0') {
    const now = new Date(Date.now() + seconds * 1000);
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
  const year = Number(timestamp.slice(0, 4));
  const month = Number(timestamp.slice(4, 6));
  const day = Number(timestamp.slice(6, 8));
  const hour = Number(timestamp.slice(8, 10));
  const minute = Number(timestamp.slice(10, 12));
  const second = Number(timestamp.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second + seconds));
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}`
  );
}

/**
 * Run `diesel migration run` against the destination directory to apply pending
 * migrations and refresh `server/src/db/schema.rs`. Used by both the entity
 * sub-generator (after adding entities) and the rust-server full-generation flow
 * (after writing the initial entity migrations) so the generated Rust code
 * compiles immediately for SQL backends.
 *
 * Safe to call from any generator. The caller is responsible for skipping it
 * for backends that do not use diesel migrations (e.g. MongoDB).
 */
export function runDieselMigrations(generator) {
  const migrationsDir = generator.destinationPath('migrations');
  if (!existsSync(migrationsDir)) return;

  generator.log.info('Running diesel migrations to update schema.rs...');
  try {
    // Ensure the database directory exists for sqlite (file-based DB).
    const dbDir = generator.destinationPath('target/db');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    const result = spawnSync('diesel', ['migration', 'run'], {
      cwd: generator.destinationPath(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (result.status === 0) {
      generator.log.ok('Diesel migrations completed successfully. schema.rs has been updated.');
    } else {
      generator.log.warn('Diesel migration failed. You may need to run "diesel migration run" manually.');
      if (result.stderr) {
        generator.log.warn(result.stderr);
      }
    }
  } catch (error) {
    generator.log.warn('Could not run diesel migrations automatically. Please run "diesel migration run" manually.');
    generator.log.warn(error.message);
  }
}

/**
 * Backfill relationship properties that the Rust templates depend on but that
 * JHipster's server bootstrap may leave unset for our use case:
 *  - `otherEntityTableName` mirrors `relationship.otherEntity.entityTableName`
 *    and is referenced throughout SQL and MongoDB Rust templates.
 *  - `joinTable.name` is normally set only for SQL many-to-many by JHipster's
 *    server bootstrap. We mirror that for MongoDB many-to-many too (the Rust
 *    MongoDB service template uses it as a link-collection name) and normalise
 *    the SQL form so it does not contain the double-underscore separator.
 */
export function backfillRelationshipForRust(entity, relationship) {
  if (!relationship.otherEntityTableName && relationship.otherEntity?.entityTableName) {
    relationship.otherEntityTableName = relationship.otherEntity.entityTableName;
  }
  if (relationship.relationshipType === 'many-to-many' && relationship.relationshipLeftSide && !relationship.joinTable) {
    relationship.joinTable = {
      name: `rel_${entity.entityTableName}__${relationship.relationshipName}`,
    };
  }
  // Normalise the join-table name to use a single underscore separator (avoids
  // Rust's snake_case lint warning for module names like `rel_store__product`).
  if (relationship.joinTable?.name) {
    relationship.joinTable.name = relationship.joinTable.name.replace('__', '_');
  }
}
