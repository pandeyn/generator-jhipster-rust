import { beforeAll, describe, expect, it } from 'vitest';
import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'rust-server';
const SUB_GENERATOR_NAMESPACE = `jhipster-rust:${SUB_GENERATOR}`;

describe('SubGenerator rust-server of rust JHipster blueprint', () => {
  describe('run', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'testApp',
          applicationType: 'monolith',
          skipClient: true,
        })
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: ['rust'],
        })
        .withJHipsterLookup()
        .withParentBlueprintLookup();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should generate Cargo.toml', () => {
      result.assertFile('Cargo.toml');
    });

    it('should generate server directory structure', () => {
      result.assertFile(['server/Cargo.toml', 'server/src/main.rs', 'server/src/lib.rs']);
    });

    it('should generate config files', () => {
      result.assertFile(['server/src/config/mod.rs', 'server/src/config/app_config.rs', 'server/src/config/database.rs']);
    });

    it('should generate database files', () => {
      result.assertFile(['server/src/db/mod.rs', 'server/src/db/connection.rs', 'server/src/db/schema.rs']);
    });

    it('should generate models', () => {
      result.assertFile(['server/src/models/mod.rs', 'server/src/models/user.rs', 'server/src/models/authority.rs']);
    });

    it('should generate handlers', () => {
      result.assertFile([
        'server/src/handlers/mod.rs',
        'server/src/handlers/health.rs',
        'server/src/handlers/user.rs',
        'server/src/handlers/account.rs',
      ]);
    });

    it('should generate services', () => {
      result.assertFile(['server/src/services/mod.rs', 'server/src/services/user_service.rs', 'server/src/services/auth_service.rs']);
    });

    it('should generate middleware', () => {
      result.assertFile(['server/src/middleware/mod.rs', 'server/src/middleware/auth.rs']);
    });

    it('should generate DTOs', () => {
      result.assertFile(['server/src/dto/mod.rs', 'server/src/dto/user_dto.rs', 'server/src/dto/pagination.rs']);
    });

    it('should generate error handling', () => {
      result.assertFile(['server/src/errors/mod.rs', 'server/src/errors/app_error.rs']);
    });

    it('should generate migrations', () => {
      result.assertFile([
        'migrations/00000000000000_diesel_initial_setup/up.sql',
        'migrations/00000000000000_diesel_initial_setup/down.sql',
        'migrations/00000000000001_create_users_authorities/up.sql',
        'migrations/00000000000001_create_users_authorities/down.sql',
      ]);
    });

    it('should generate diesel.toml', () => {
      result.assertFile('diesel.toml');
    });

    it('should generate .env file', () => {
      result.assertFile('.env');
    });

    it('should generate Dockerfile', () => {
      result.assertFile('Dockerfile');
    });
  });
});
