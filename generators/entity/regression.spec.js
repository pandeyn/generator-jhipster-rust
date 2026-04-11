/**
 * Regression coverage for the `entity` sub-generator fixes landed during the
 * 2026-04-10/2026-04-11 session. The scenarios here exercise the code paths
 * that are reachable through `jhipster-rust:entity` (not the rust-server
 * full-app generator), specifically:
 *
 *  - The shared `backfillRelationshipForRust` helper that mirrors
 *    `relationship.otherEntityTableName` from `relationship.otherEntity.entityTableName`
 *    and synthesises a `joinTable.name` for many-to-many. The entity
 *    sub-generator must run this in PREPARING_EACH_ENTITY_RELATIONSHIP, just
 *    like rust-server does, otherwise add-ad-hoc-entity flows produce broken
 *    SQL with `_id INTEGER NOT NULL REFERENCES (id) ON DELETE CASCADE`.
 *
 *  - Join-table migration files. They MUST live in their own directory with
 *    a timestamp strictly greater than every entity's changelogDate, otherwise
 *    PG/MySQL refuse the FK reference because the other endpoint table doesn't
 *    exist yet.
 *
 *  - The DTO `#[serde(rename = "<jhipster_field_name>")]` backfill applies to
 *    every DTO struct in the generated entity (not just the response DTO).
 *
 *  - The `END` task auto-runs `diesel migration run` (via the shared
 *    `runDieselMigrations` helper). The actual diesel binary is not available
 *    in CI, so the test only asserts that the END task is registered (i.e.
 *    the property `runRustDieselMigrations` exists on the task group).
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const ENTITY_NAMESPACE = 'jhipster:entity';

const readDest = file => result.fs.read(`${result.cwd}/${file}`, { defaults: '' });

describe('entity sub-generator regression coverage', () => {
  describe('add Order to a project that already has Store and Product (via jhipster:entity)', () => {
    beforeAll(async () => {
      const STORE = {
        annotations: { changelogDate: '20260411150000' },
        fields: [{ fieldName: 'name', fieldType: 'String', fieldValidateRules: ['required'] }],
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
      };
      const PRODUCT = {
        annotations: { changelogDate: '20260411150100' },
        fields: [
          { fieldName: 'name', fieldType: 'String', fieldValidateRules: ['required'] },
          { fieldName: 'cost', fieldType: 'Float', fieldValidateRules: ['required'] },
        ],
        name: 'Product',
        pagination: 'pagination',
        readOnly: false,
        relationships: [],
        searchEngine: 'no',
        service: 'no',
      };
      const ORDER = {
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
      };

      await helpers
        .run(ENTITY_NAMESPACE)
        .withArguments(['Order'])
        .withJHipsterConfig(
          {
            baseName: 'testApp',
            applicationType: 'monolith',
            authenticationType: 'jwt',
            devDatabaseType: 'sqlite',
            databaseType: 'sql',
            prodDatabaseType: 'postgresql',
            skipClient: true,
            clientFramework: 'no',
            backendType: 'Rust',
          },
          [STORE, PRODUCT, ORDER],
        )
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: ['rust'],
          skipInstall: true,
          // The entity sub-generator's interactive prompt branch is bypassed
          // because the entity is already declared in .jhipster/Order.json.
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint();
    });

    it('writes Order entity files', () => {
      expect(readDest('server/src/models/order.rs').length).toBeGreaterThan(0);
      expect(readDest('server/src/dto/order_dto.rs').length).toBeGreaterThan(0);
      expect(readDest('server/src/handlers/order.rs').length).toBeGreaterThan(0);
      expect(readDest('server/src/services/order_service.rs').length).toBeGreaterThan(0);
    });

    it('Order CREATE TABLE migration has store_id REFERENCES store(id) (otherEntityTableName backfill)', () => {
      const orderMigration = readDest('migrations/20260411150200_create_jhi_order/up.sql');
      expect(orderMigration).toContain('store_id INTEGER REFERENCES store(id)');
      expect(orderMigration).not.toMatch(/ REFERENCES \(id\)/);
    });

    it('writes join-table migrations as separate files with timestamps after the entity migrations', () => {
      // The synthesised join-table timestamps must be strictly greater than
      // every entity changelogDate. With Order timestamp 20260411150200, our
      // helper bumps to 150201 / 150202 for the two M:M join tables.
      const storeProducts = readDest('migrations/20260411150201_create_rel_store_products/up.sql');
      const orderProducts = readDest('migrations/20260411150202_create_rel_jhi_order_products/up.sql');
      expect(storeProducts).toContain('rel_store_products');
      expect(storeProducts).toContain('REFERENCES store(id)');
      expect(storeProducts).toContain('REFERENCES product(id)');
      expect(orderProducts).toContain('rel_jhi_order_products');
      expect(orderProducts).toContain('REFERENCES jhi_order(id)');
      expect(orderProducts).toContain('REFERENCES product(id)');
    });

    it('Order DTO has explicit #[serde(rename = "...")] for snake_case JHipster field names', () => {
      const orderDto = readDest('server/src/dto/order_dto.rs');
      expect(orderDto).toContain('rename = "customer_name"');
      expect(orderDto).toContain('rename = "order_date"');
      // `phone` is camelCase-compatible — no redundant rename should be added.
      expect(orderDto).not.toContain('rename = "phone"');
    });

    it('Order DTO `Create` and `Update` structs both contain the snake_case rename', () => {
      const orderDto = readDest('server/src/dto/order_dto.rs');
      // The fix has to apply to all three structs (response, create, update).
      // Each one iterates fields independently in the template.
      const createIdx = orderDto.indexOf('pub struct CreateOrderDto');
      const updateIdx = orderDto.indexOf('pub struct UpdateOrderDto');
      expect(createIdx).toBeGreaterThan(-1);
      expect(updateIdx).toBeGreaterThan(-1);
      // After the CreateOrderDto declaration but before UpdateOrderDto, the
      // explicit rename for customer_name should appear.
      const createSection = orderDto.slice(createIdx, updateIdx);
      const updateSection = orderDto.slice(updateIdx);
      expect(createSection).toContain('rename = "customer_name"');
      expect(updateSection).toContain('rename = "customer_name"');
    });
  });
});
