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

    it('should use port 8080 for monolith', () => {
      result.assertFileContent('.env', 'APP_PORT=8080');
      result.assertFileContent('Dockerfile', 'APP_PORT=8080');
      result.assertFileContent('Dockerfile', 'EXPOSE 8080');
    });

    it('should not generate Consul files for monolith', () => {
      result.assertNoFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs', 'docs/CONSUL.md']);
    });
  });

  describe('microservice with consul', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'microApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
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

    it('should generate Consul config files', () => {
      result.assertFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs']);
    });

    it('should generate Consul documentation', () => {
      result.assertFile('docs/CONSUL.md');
    });

    it('should include Consul environment variables in .env', () => {
      result.assertFileContent('.env', 'CONSUL_HOST=localhost');
      result.assertFileContent('.env', 'CONSUL_PORT=8500');
      result.assertFileContent('.env', 'CONSUL_SERVICE_NAME=microapp');
    });

    it('should include Consul imports in lib.rs', () => {
      result.assertFileContent('server/src/lib.rs', 'use services::ConsulService;');
      result.assertFileContent('server/src/lib.rs', 'pub consul_service: Option<Arc<ConsulService>>');
    });

    it('should include Consul initialization in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'ConsulConfig::from_env()');
      result.assertFileContent('server/src/main.rs', 'ConsulService::new(consul_config.clone())');
      result.assertFileContent('server/src/main.rs', 'register_service');
    });

    it('should include hostname dependency in Cargo.toml', () => {
      result.assertFileContent('Cargo.toml', 'hostname');
    });

    it('should not generate static files handler for microservice without microfrontend', () => {
      result.assertNoFile('server/src/handlers/static_files.rs');
      result.assertNoFile('docs/STATIC_HOSTING.md');
    });

    it('should use port 8081 for microservice', () => {
      result.assertFileContent('.env', 'APP_PORT=8081');
      result.assertFileContent('Dockerfile', 'APP_PORT=8081');
      result.assertFileContent('Dockerfile', 'EXPOSE 8081');
    });
  });

  describe('microservice with microfrontend', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'microFrontendApp',
          applicationType: 'microservice',
          skipClient: false,
          clientFramework: 'angular',
          serviceDiscoveryType: 'consul',
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

    it('should generate static files handler for microservice with microfrontend', () => {
      result.assertFile('server/src/handlers/static_files.rs');
      result.assertFile('docs/STATIC_HOSTING.md');
    });

    it('should include static hosting imports in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'use tower_http::services::ServeDir');
    });

    it('should include static hosting config in app_config.rs', () => {
      result.assertFileContent('server/src/config/app_config.rs', 'serve_static_files');
      result.assertFileContent('server/src/config/app_config.rs', 'static_files_dir');
    });
  });

  describe('gateway with consul', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'gatewayApp',
          applicationType: 'gateway',
          skipClient: true,
          serviceDiscoveryType: 'consul',
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

    it('should generate Consul config files', () => {
      result.assertFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs']);
    });

    it('should generate Consul documentation', () => {
      result.assertFile('docs/CONSUL.md');
    });

    it('should generate static files handler for gateway (always enabled)', () => {
      result.assertFile('server/src/handlers/static_files.rs');
      result.assertFile('docs/STATIC_HOSTING.md');
    });

    it('should use port 8080 for gateway', () => {
      result.assertFileContent('.env', 'APP_PORT=8080');
      result.assertFileContent('Dockerfile', 'APP_PORT=8080');
      result.assertFileContent('Dockerfile', 'EXPOSE 8080');
    });
  });

  describe('microservice without consul', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noConsulApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'no',
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

    it('should not generate Consul files', () => {
      result.assertNoFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs', 'docs/CONSUL.md']);
    });

    it('should not include Consul environment variables in .env', () => {
      result.assertNoFileContent('.env', 'CONSUL_HOST');
    });

    it('should not generate static files handler for microservice without microfrontend', () => {
      result.assertNoFile('server/src/handlers/static_files.rs');
      result.assertNoFile('docs/STATIC_HOSTING.md');
    });
  });
});
