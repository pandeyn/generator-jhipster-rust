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

  describe('monolith with kafka', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'kafkaApp',
          applicationType: 'monolith',
          skipClient: true,
          messageBroker: 'kafka',
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

    it('should generate Kafka config files', () => {
      result.assertFile([
        'server/src/config/kafka_config.rs',
        'server/src/services/kafka_producer.rs',
        'server/src/services/kafka_consumer.rs',
        'server/src/handlers/kafka.rs',
      ]);
    });

    it('should generate Kafka documentation', () => {
      result.assertFile('docs/KAFKA.md');
    });

    it('should include Kafka environment variables in .env', () => {
      result.assertFileContent('.env', 'KAFKA_ENABLED=true');
      result.assertFileContent('.env', 'KAFKA_BOOTSTRAP_SERVERS=localhost:29092');
      result.assertFileContent('.env', 'KAFKA_GROUP_ID=kafka-app-group');
      result.assertFileContent('.env', 'KAFKA_DEFAULT_TOPIC=kafka-app-topic');
    });

    it('should include Kafka imports in lib.rs', () => {
      result.assertFileContent('server/src/lib.rs', 'use services::{KafkaProducer, KafkaConsumer};');
      result.assertFileContent('server/src/lib.rs', 'pub kafka_producer: Option<Arc<KafkaProducer>>');
      result.assertFileContent('server/src/lib.rs', 'pub kafka_consumer: Option<Arc<KafkaConsumer>>');
    });

    it('should include Kafka initialization in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'KafkaConfig::from_env()');
      result.assertFileContent('server/src/main.rs', 'KafkaProducer::new(kafka_config.clone())');
      result.assertFileContent('server/src/main.rs', 'KafkaConsumer::new(kafka_config.clone())');
    });

    it('should include Kafka handler module in handlers/mod.rs', () => {
      result.assertFileContent('server/src/handlers/mod.rs', 'pub mod kafka;');
    });

    it('should include Kafka services in services/mod.rs', () => {
      result.assertFileContent('server/src/services/mod.rs', 'mod kafka_producer;');
      result.assertFileContent('server/src/services/mod.rs', 'mod kafka_consumer;');
    });

    it('should include rdkafka dependency in Cargo.toml', () => {
      result.assertFileContent('Cargo.toml', 'rdkafka');
      result.assertFileContent('Cargo.toml', 'tokio-stream');
    });

    it('should include Kafka routes in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'kafka-app-kafka');
      result.assertFileContent('server/src/main.rs', 'handlers::kafka::routes()');
    });

    it('should include Kafka endpoints in OpenAPI documentation', () => {
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::publish_message');
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::consume_messages');
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::get_status');
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::PublishRequest');
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::PublishResponse');
      result.assertFileContent('server/src/openapi.rs', 'handlers::kafka::KafkaStatus');
      result.assertFileContent('server/src/openapi.rs', 'kafka-app-kafka');
    });
  });

  describe('monolith without kafka', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noKafkaApp',
          applicationType: 'monolith',
          skipClient: true,
          messageBroker: 'no',
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

    it('should not generate Kafka files', () => {
      result.assertNoFile([
        'server/src/config/kafka_config.rs',
        'server/src/services/kafka_producer.rs',
        'server/src/services/kafka_consumer.rs',
        'server/src/handlers/kafka.rs',
        'docs/KAFKA.md',
      ]);
    });

    it('should not include Kafka environment variables in .env', () => {
      result.assertNoFileContent('.env', 'KAFKA_ENABLED');
      result.assertNoFileContent('.env', 'KAFKA_BOOTSTRAP_SERVERS');
    });

    it('should not include rdkafka dependency in Cargo.toml', () => {
      result.assertNoFileContent('Cargo.toml', 'rdkafka');
    });

    it('should not include Kafka endpoints in OpenAPI documentation', () => {
      result.assertNoFileContent('server/src/openapi.rs', 'handlers::kafka');
    });
  });
});
