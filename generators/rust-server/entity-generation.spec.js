/**
 * Regression coverage for the entity-generation fixes landed during the
 * 2026-04-10/2026-04-11 session. Each `it(...)` block here corresponds to a bug
 * we hit while creating /tmp/oldie-sample-* projects:
 *
 *  - Snake_case JHipster field names (e.g. `customer_name`, `order_date`) need
 *    `#[serde(rename = "<jhipster_field_name>")]` so the React/Angular form
 *    payload deserializes correctly.
 *  - SQL migrations need `relationship.otherEntityTableName` populated even when
 *    the JHipster server bootstrap doesn't run (otherwise FKs come out broken).
 *  - Many-to-many join tables MUST live in their own migration with a timestamp
 *    that sorts AFTER all entity CREATE TABLE migrations, otherwise PG/MySQL
 *    refuse the FK reference because the other endpoint table doesn't exist yet.
 *  - The Diesel `RelationshipId` deserializer must accept string-encoded integer
 *    ids that React multi-selects send as `{id: "1"}`.
 *  - The Diesel service template must use `Selectable::as_select()` so column
 *    matching is by name (otherwise an `ALTER TABLE ADD COLUMN` later breaks
 *    every `.load::<Entity>(conn)` call because positional matching shifts).
 *  - The Rust file naming must derive from `entityNameKebabCase` (a base entity
 *    property) instead of `entityFileName` (a *client*-derived property which
 *    is undefined when `clientFramework: 'no'`).
 *  - The rust-server generator must `dependsOnBootstrap('server')` so JHipster's
 *    server bootstrap populates `persistClass`, `entityClass`, etc.
 *  - For MongoDB, no SQL migrations should be written, and `joinTable.name` must
 *    still be backfilled (the Mongo service template uses it as a link-collection
 *    name).
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR_NAMESPACE = 'jhipster-rust:rust-server';

// Three entities exercising the relationships that have caused regressions:
//   - Store ↔ Product (many-to-many) — first M:M, fully bidirectional via owner side
//   - Product             — empty relationships, back-references are derived by JHipster
//   - Order  → Store      (many-to-one)  — exercises FK column on the "many" side
//   - Order  ↔ Product    (many-to-many) — second M:M to verify multiple join tables
//
// Notes:
//   - Order.fields use snake_case names on purpose to exercise the DTO rename fix.
//   - Order.entityTableName is `jhi_order` because `order` is a SQL reserved word.
const ENTITIES = [
  {
    annotations: { changelogDate: '20260411150000' },
    fields: [
      { fieldName: 'name', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'city', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'zip', fieldType: 'String', fieldValidateRules: ['required'] },
    ],
    name: 'Store',
    pagination: 'pagination',
    readOnly: false,
    relationships: [
      {
        otherEntityField: 'name',
        otherEntityName: 'product',
        otherEntityRelationshipName: 'stores',
        relationshipName: 'products',
        relationshipSide: 'left',
        relationshipType: 'many-to-many',
      },
    ],
    searchEngine: 'no',
    service: 'no',
  },
  {
    annotations: { changelogDate: '20260411150100' },
    fields: [
      { fieldName: 'name', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'unit', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'cost', fieldType: 'Float', fieldValidateRules: ['required'] },
    ],
    name: 'Product',
    pagination: 'pagination',
    readOnly: false,
    relationships: [],
    searchEngine: 'no',
    service: 'no',
  },
  {
    annotations: { changelogDate: '20260411150200' },
    entityTableName: 'jhi_order',
    fields: [
      { fieldName: 'customer_name', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'phone', fieldType: 'String', fieldValidateRules: ['required'] },
      { fieldName: 'order_date', fieldType: 'Instant', fieldValidateRules: ['required'] },
    ],
    name: 'Order',
    pagination: 'pagination',
    readOnly: false,
    relationships: [
      {
        otherEntityField: 'name',
        otherEntityName: 'store',
        otherEntityRelationshipName: 'orders',
        relationshipName: 'store',
        relationshipSide: 'left',
        relationshipType: 'many-to-one',
      },
      {
        otherEntityField: 'name',
        otherEntityName: 'product',
        otherEntityRelationshipName: 'orders',
        relationshipName: 'products',
        relationshipSide: 'left',
        relationshipType: 'many-to-many',
      },
    ],
    searchEngine: 'no',
    service: 'no',
  },
];

const readDest = file => result.fs.read(`${result.cwd}/${file}`, { defaults: '' });

const databases = [
  { devDatabaseType: 'sqlite', databaseType: 'sql' },
  { devDatabaseType: 'postgresql', databaseType: 'sql' },
  { devDatabaseType: 'mysql', databaseType: 'sql' },
  { devDatabaseType: 'mongodb', databaseType: 'mongodb' },
];

describe('rust-server entity generation regression coverage', () => {
  for (const db of databases) {
    describe(`${db.devDatabaseType} backend`, () => {
      beforeAll(async () => {
        await helpers
          .run(SUB_GENERATOR_NAMESPACE)
          .withJHipsterConfig(
            {
              baseName: 'testApp',
              applicationType: 'monolith',
              authenticationType: 'jwt',
              devDatabaseType: db.devDatabaseType,
              databaseType: db.databaseType,
              skipClient: true,
              clientFramework: 'no',
              backendType: 'Rust',
            },
            ENTITIES,
          )
          .withOptions({ ignoreNeedlesError: true, blueprint: ['rust'], skipInstall: true })
          .withJHipsterGenerators()
          .withConfiguredBlueprint();
      });

      it('writes a Rust model file for every entity (entityFileName fallback)', () => {
        // Regression: rust-server/files.js used data.entityFileName which is set
        // by the *client* generator. With skipClient/clientFramework='no' that
        // property was undefined and toSnakeCase(undefined) crashed. Fix: fall
        // back to entityNameKebabCase / entityInstance / name.
        expect(readDest('server/src/models/store.rs').length).toBeGreaterThan(0);
        expect(readDest('server/src/models/product.rs').length).toBeGreaterThan(0);
        expect(readDest('server/src/models/order.rs').length).toBeGreaterThan(0);
      });

      it('writes a DTO file for every entity', () => {
        expect(readDest('server/src/dto/store_dto.rs').length).toBeGreaterThan(0);
        expect(readDest('server/src/dto/product_dto.rs').length).toBeGreaterThan(0);
        expect(readDest('server/src/dto/order_dto.rs').length).toBeGreaterThan(0);
      });

      it('renames snake_case JHipster fields explicitly in every Order DTO struct', () => {
        // Regression: `#[serde(rename_all = "camelCase")]` was clobbering
        // snake_case field names like `customer_name` -> `customerName`, but
        // the generated React/Angular forms send the original `customer_name`.
        const orderDto = readDest('server/src/dto/order_dto.rs');
        expect(orderDto).toContain('rename = "customer_name"');
        expect(orderDto).toContain('rename = "order_date"');
        // camelCase fields should NOT receive a redundant explicit rename:
        // `phone` is already what `rename_all = camelCase` would emit.
        const phoneRenameOccurrences = (orderDto.match(/rename = "phone"/g) || []).length;
        expect(phoneRenameOccurrences).toBe(0);
      });

      // -------- SQL-only assertions ----------------------------------------
      if (db.databaseType !== 'mongodb') {
        it('writes one CREATE TABLE migration per entity', () => {
          expect(readDest('migrations/20260411150000_create_store/up.sql').length).toBeGreaterThan(0);
          expect(readDest('migrations/20260411150100_create_product/up.sql').length).toBeGreaterThan(0);
          expect(readDest('migrations/20260411150200_create_jhi_order/up.sql').length).toBeGreaterThan(0);
        });

        it('Order CREATE TABLE migration has store_id REFERENCES store(id)', () => {
          // Regression: relationship.otherEntityTableName was undefined when the
          // server bootstrap didn't run, producing broken SQL like
          // `_id INTEGER NOT NULL REFERENCES (id) ON DELETE CASCADE`.
          const orderMigration = readDest('migrations/20260411150200_create_jhi_order/up.sql');
          expect(orderMigration).toContain('store_id');
          expect(orderMigration).toContain('REFERENCES store(id)');
          // Negative assertion: no broken empty `REFERENCES (id)` substring.
          expect(orderMigration).not.toMatch(/ REFERENCES \(id\)/);
        });

        it('emits join-table migrations as separate files with timestamps after all entities', () => {
          // Regression: join tables used to live inside the entity migration so
          // Store's M:M-to-Product migration tried to FK product(id) before the
          // product table existed. PG/MySQL rejected the FK silently and the
          // resulting schema.rs was missing the join table. Fix: separate
          // migration with a timestamp strictly greater than every entity's
          // changelogDate (max + 1, max + 2, ...).
          const storeProductsUp = readDest('migrations/20260411150201_create_rel_store_products/up.sql');
          const orderProductsUp = readDest('migrations/20260411150202_create_rel_jhi_order_products/up.sql');
          expect(storeProductsUp).toContain('rel_store_products');
          expect(storeProductsUp).toContain('REFERENCES store(id)');
          expect(storeProductsUp).toContain('REFERENCES product(id)');
          expect(orderProductsUp).toContain('rel_jhi_order_products');
          expect(orderProductsUp).toContain('REFERENCES jhi_order(id)');
          expect(orderProductsUp).toContain('REFERENCES product(id)');

          // Negative assertion: the entity migration must NOT contain join-table
          // CREATE statements anymore.
          const storeMigration = readDest('migrations/20260411150000_create_store/up.sql');
          expect(storeMigration).not.toContain('CREATE TABLE rel_store_products');
        });

        it('common.rs RelationshipId deserializer accepts string-encoded ids', () => {
          // Regression: React multi-selects post `{id: "1"}` (HTML form value is
          // always a string), but the untagged `IdOrObject` enum only had
          // `Object { id: i32 }` and rejected the string id, returning
          // `data did not match any variant of untagged enum IdOrObject`.
          const commonRs = readDest('server/src/dto/common.rs');
          expect(commonRs).toContain('parse_i32_value');
          expect(commonRs).toContain('serde_json::Value');
        });

        it('the Diesel service template uses Selectable::as_select() instead of positional .load::<T>', () => {
          // Regression: positional `.load::<Entity>(conn)` matches columns by
          // struct field order. After ALTER TABLE ADD COLUMN appends a column
          // to the end of the table the model and schema fall out of sync and
          // every query fails to compile. Fix: select via Selectable.
          const productService = readDest('server/src/services/product_service.rs');
          expect(productService).toContain('::as_select()');
          expect(productService).not.toMatch(/\.load::<Product>\(conn\)/);
          expect(productService).not.toMatch(/\.first::<Product>\(conn\)/);
        });
      }

      // -------- MongoDB-only assertions ------------------------------------
      if (db.databaseType === 'mongodb') {
        it('does NOT write SQL CREATE migrations for MongoDB', () => {
          // Regression: rust-server's writingEntitiesTemplateTask was unconditionally
          // writing per-entity SQL migrations even for Mongo backends.
          expect(readDest('migrations/20260411150000_create_store/up.sql')).toBe('');
          expect(readDest('migrations/20260411150100_create_product/up.sql')).toBe('');
          expect(readDest('migrations/20260411150200_create_jhi_order/up.sql')).toBe('');
        });

        it('does NOT write SQL join-table migrations for MongoDB', () => {
          expect(readDest('migrations/20260411150201_create_rel_store_products/up.sql')).toBe('');
          expect(readDest('migrations/20260411150202_create_rel_jhi_order_products/up.sql')).toBe('');
        });

        it('Mongo Order model references store_id (otherEntityTableName backfilled)', () => {
          // Regression: even for MongoDB, the model template references
          // `<%= rel.otherEntityTableName %>_id`. Without the backfill that
          // expanded to `_id` and the model wouldn't compile.
          const orderModel = readDest('server/src/models/order.rs');
          expect(orderModel).toContain('store_id');
        });

        it('Mongo service uses joinTable.name for the M:M link collection', () => {
          // Regression: JHipster's prepareRelationshipForDatabase only sets
          // joinTable for SQL backends (`databaseTypeSql && manyToMany && ownerSide`)
          // so for Mongo `rel.joinTable` was undefined and the service template
          // crashed at `<%= rel.joinTable.name %>`. Fix: backfill joinTable for
          // every owner-side many-to-many regardless of database type.
          const orderService = readDest('server/src/services/order_service.rs');
          const hasLinkCollection = orderService.includes('rel_jhi_order_products') || orderService.includes('rel_jhi_order__products');
          expect(hasLinkCollection).toBe(true);
        });
      }
    });
  }
});
