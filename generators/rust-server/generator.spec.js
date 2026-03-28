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
      // Circuit breaker is enabled by default for microservices, so Consul uses it
      result.assertFileContent('server/src/main.rs', 'ConsulService::new(consul_config.clone(), circuit_breaker.clone())');
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

  // ==================== Circuit Breaker Integration Tests ====================

  describe('microservice with circuit breaker (default enabled)', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbMicroApp',
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

    it('should generate circuit breaker config files', () => {
      result.assertFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
      ]);
    });

    it('should generate circuit breaker documentation', () => {
      result.assertFile('docs/CIRCUIT_BREAKER.md');
    });

    it('should include circuit breaker environment variables in .env', () => {
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_ENABLED=true');
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_FAILURE_RATE_THRESHOLD=0.5');
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_SLIDING_WINDOW_SIZE=100');
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_WAIT_DURATION_SECS=60');
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_PERMITTED_CALLS_HALF_OPEN=10');
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_REQUEST_TIMEOUT_MS=30000');
    });

    it('should include circuit breaker imports in lib.rs', () => {
      result.assertFileContent('server/src/lib.rs', 'use services::CircuitBreakerService;');
      result.assertFileContent('server/src/lib.rs', 'pub circuit_breaker: Option<Arc<CircuitBreakerService>>');
    });

    it('should include circuit breaker initialization in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'CircuitBreakerConfig::from_env()');
      result.assertFileContent('server/src/main.rs', 'CircuitBreakerService::new(circuit_breaker_config)');
    });

    it('should initialize circuit breaker before Consul service registration', () => {
      // Circuit breaker should be initialized before the main Consul service registration
      // Note: A temporary ConsulService is created earlier for config loading (without circuit breaker)
      const mainRs = result.getSnapshot()['server/src/main.rs']?.contents;
      if (mainRs) {
        const cbIndex = mainRs.indexOf('CircuitBreakerConfig::from_env()');
        const consulRegisterIndex = mainRs.indexOf('register_service');
        expect(cbIndex).toBeLessThan(consulRegisterIndex);
      }
    });

    it('should pass circuit breaker to Consul service', () => {
      result.assertFileContent('server/src/main.rs', 'ConsulService::new(consul_config.clone(), circuit_breaker.clone())');
    });

    it('should include circuit breaker config export in config/mod.rs', () => {
      result.assertFileContent('server/src/config/mod.rs', 'mod circuit_breaker_config;');
      result.assertFileContent('server/src/config/mod.rs', 'pub use circuit_breaker_config::*;');
    });

    it('should include circuit breaker service export in services/mod.rs', () => {
      result.assertFileContent('server/src/services/mod.rs', 'mod circuit_breaker_service;');
      result.assertFileContent(
        'server/src/services/mod.rs',
        'pub use circuit_breaker_service::{CircuitBreakerService, CircuitBreakerError, CircuitBreakerStatus, CircuitState}',
      );
      result.assertFileContent('server/src/services/mod.rs', 'mod resilient_http_client;');
      result.assertFileContent('server/src/services/mod.rs', 'pub use resilient_http_client::{ResilientHttpClient, ResilientHttpError}');
    });
  });

  describe('gateway with circuit breaker (default enabled)', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbGatewayApp',
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

    it('should generate circuit breaker config files', () => {
      result.assertFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
      ]);
    });

    it('should generate circuit breaker documentation', () => {
      result.assertFile('docs/CIRCUIT_BREAKER.md');
    });

    it('should include circuit breaker environment variables in .env', () => {
      result.assertFileContent('.env', 'CIRCUIT_BREAKER_ENABLED=true');
    });

    it('should integrate circuit breaker with Consul', () => {
      result.assertFileContent('server/src/main.rs', 'ConsulService::new(consul_config.clone(), circuit_breaker.clone())');
    });
  });

  describe('microservice with circuit breaker explicitly disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noCbMicroApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          circuitBreaker: false,
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

    it('should not generate circuit breaker files', () => {
      result.assertNoFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
        'docs/CIRCUIT_BREAKER.md',
      ]);
    });

    it('should not include circuit breaker environment variables in .env', () => {
      result.assertNoFileContent('.env', 'CIRCUIT_BREAKER_ENABLED');
    });

    it('should not include circuit breaker imports in lib.rs', () => {
      result.assertNoFileContent('server/src/lib.rs', 'CircuitBreakerService');
    });

    it('should use Consul without circuit breaker', () => {
      // When circuit breaker is disabled, Consul should be initialized without it
      result.assertFileContent('server/src/main.rs', 'ConsulService::new(consul_config.clone())');
      result.assertNoFileContent('server/src/main.rs', 'circuit_breaker.clone()');
    });
  });

  describe('monolith without circuit breaker (not enabled for monoliths)', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'monolithApp',
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

    it('should not generate circuit breaker files for monolith', () => {
      result.assertNoFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
        'docs/CIRCUIT_BREAKER.md',
      ]);
    });

    it('should not include circuit breaker environment variables in .env', () => {
      result.assertNoFileContent('.env', 'CIRCUIT_BREAKER_ENABLED');
    });
  });

  describe('microservice with circuit breaker and Consul integration', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbConsulApp',
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

    it('should have Consul service accept circuit breaker parameter', () => {
      result.assertFileContent('server/src/services/consul_service.rs', 'circuit_breaker: Option<Arc<CircuitBreakerService>>');
    });

    it('should use execute_with_circuit_breaker helper in Consul service', () => {
      result.assertFileContent('server/src/services/consul_service.rs', 'async fn execute_with_circuit_breaker');
    });

    it('should have CircuitBreakerOpen error variant in Consul service', () => {
      result.assertFileContent('server/src/services/consul_service.rs', 'CircuitBreakerOpen');
    });

    it('should document circuit breaker integration with Consul', () => {
      result.assertFileContent('docs/CIRCUIT_BREAKER.md', 'Integration with Service Discovery');
      result.assertFileContent('docs/CIRCUIT_BREAKER.md', 'Consul');
    });
  });

  describe('microservice with circuit breaker but without Consul', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbNoConsulApp',
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

    it('should generate circuit breaker files', () => {
      result.assertFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
        'docs/CIRCUIT_BREAKER.md',
      ]);
    });

    it('should not generate Consul files', () => {
      result.assertNoFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs']);
    });

    it('should include circuit breaker initialization in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'CircuitBreakerConfig::from_env()');
      result.assertFileContent('server/src/main.rs', 'CircuitBreakerService::new(circuit_breaker_config)');
    });

    it('should not reference Consul in main.rs', () => {
      result.assertNoFileContent('server/src/main.rs', 'ConsulService');
    });
  });

  // ==================== Circuit Breaker with Prometheus Metrics Tests ====================

  describe('microservice with circuit breaker and prometheus', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbPrometheusApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          monitoring: 'prometheus',
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

    it('should generate circuit breaker metrics file', () => {
      result.assertFile('server/src/services/circuit_breaker_metrics.rs');
    });

    it('should export circuit breaker metrics module in services/mod.rs', () => {
      result.assertFileContent('server/src/services/mod.rs', 'pub mod circuit_breaker_metrics;');
    });

    it('should import circuit breaker metrics in circuit_breaker_service.rs', () => {
      result.assertFileContent('server/src/services/circuit_breaker_service.rs', 'use super::circuit_breaker_metrics as cb_metrics;');
    });

    it('should record metrics in circuit_breaker_service.rs', () => {
      result.assertFileContent('server/src/services/circuit_breaker_service.rs', 'cb_metrics::record_success');
      result.assertFileContent('server/src/services/circuit_breaker_service.rs', 'cb_metrics::record_failure');
      result.assertFileContent('server/src/services/circuit_breaker_service.rs', 'cb_metrics::record_state');
      result.assertFileContent('server/src/services/circuit_breaker_service.rs', 'cb_metrics::record_rejected');
    });

    it('should initialize circuit breaker metrics in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'circuit_breaker_metrics::init_metrics()');
    });

    it('should document circuit breaker Prometheus metrics', () => {
      result.assertFileContent('docs/CIRCUIT_BREAKER.md', 'circuit_breaker_state');
      result.assertFileContent('docs/CIRCUIT_BREAKER.md', 'circuit_breaker_calls_total');
      result.assertFileContent('docs/CIRCUIT_BREAKER.md', 'circuit_breaker_failure_rate');
    });

    it('should reference circuit breaker metrics in Prometheus documentation', () => {
      result.assertFileContent('docs/PROMETHEUS.md', 'Circuit Breaker Metrics');
      result.assertFileContent('docs/PROMETHEUS.md', 'circuit_breaker_state');
    });
  });

  describe('microservice with circuit breaker but without prometheus', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'cbNoPrometheusApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'no',
          monitoring: 'no',
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

    it('should generate circuit breaker files', () => {
      result.assertFile([
        'server/src/config/circuit_breaker_config.rs',
        'server/src/services/circuit_breaker_service.rs',
        'server/src/services/resilient_http_client.rs',
      ]);
    });

    it('should NOT generate circuit breaker metrics file', () => {
      result.assertNoFile('server/src/services/circuit_breaker_metrics.rs');
    });

    it('should NOT export circuit breaker metrics module in services/mod.rs', () => {
      result.assertNoFileContent('server/src/services/mod.rs', 'circuit_breaker_metrics');
    });

    it('should NOT import circuit breaker metrics in circuit_breaker_service.rs', () => {
      result.assertNoFileContent('server/src/services/circuit_breaker_service.rs', 'cb_metrics');
    });

    it('should NOT initialize circuit breaker metrics in main.rs', () => {
      result.assertNoFileContent('server/src/main.rs', 'circuit_breaker_metrics::init_metrics');
    });
  });

  // ==================== External Configuration Tests ====================

  describe('microservice with consul config profiles and watching', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'configApp',
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

    it('should include config profile env vars in .env', () => {
      result.assertFileContent('.env', 'APP_PROFILE=dev');
      result.assertFileContent('.env', 'CONSUL_CONFIG_WATCH_ENABLED=true');
      result.assertFileContent('.env', 'CONSUL_CONFIG_WATCH_INTERVAL=55');
    });

    it('should include config_profile field in consul_config.rs', () => {
      result.assertFileContent('server/src/config/consul_config.rs', 'config_profile: String');
      result.assertFileContent('server/src/config/consul_config.rs', 'watch_enabled: bool');
      result.assertFileContent('server/src/config/consul_config.rs', 'watch_interval: u64');
    });

    it('should include config key helper methods in consul_config.rs', () => {
      result.assertFileContent('server/src/config/consul_config.rs', 'fn config_base_key');
      result.assertFileContent('server/src/config/consul_config.rs', 'fn config_profile_key');
    });

    it('should include profiled config loading in consul_service.rs', () => {
      result.assertFileContent('server/src/services/consul_service.rs', 'fn load_profiled_config');
      result.assertFileContent('server/src/services/consul_service.rs', 'fn watch_config');
      result.assertFileContent('server/src/services/consul_service.rs', 'fn load_all_config');
    });

    it('should include from_consul_and_env in app_config.rs', () => {
      result.assertFileContent('server/src/config/app_config.rs', 'fn from_consul_and_env');
    });

    it('should use from_consul_and_env in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'AppConfig::from_consul_and_env');
      result.assertFileContent('server/src/main.rs', 'load_profiled_config');
    });

    it('should generate remote_config.rs for hot-reload', () => {
      result.assertFile('server/src/config/remote_config.rs');
      result.assertFileContent('server/src/config/remote_config.rs', 'pub struct RemoteConfig');
      result.assertFileContent('server/src/config/remote_config.rs', 'fn from_consul_kv');
      result.assertFileContent('server/src/config/remote_config.rs', 'SharedRemoteConfig');
    });

    it('should generate config_watcher.rs for hot-reload', () => {
      result.assertFile('server/src/config/config_watcher.rs');
      result.assertFileContent('server/src/config/config_watcher.rs', 'pub struct ConfigWatcher');
      result.assertFileContent('server/src/config/config_watcher.rs', 'async fn run');
    });

    it('should include remote_config and config_watcher in config/mod.rs', () => {
      result.assertFileContent('server/src/config/mod.rs', 'mod remote_config;');
      result.assertFileContent('server/src/config/mod.rs', 'mod config_watcher;');
      result.assertFileContent('server/src/config/mod.rs', 'pub use remote_config::*;');
      result.assertFileContent('server/src/config/mod.rs', 'pub use config_watcher::*;');
    });

    it('should include SharedRemoteConfig in AppState', () => {
      result.assertFileContent('server/src/lib.rs', 'use config::SharedRemoteConfig;');
      result.assertFileContent('server/src/lib.rs', 'pub remote_config: SharedRemoteConfig');
    });

    it('should spawn config watcher in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'ConfigWatcher::new');
      result.assertFileContent('server/src/main.rs', 'watcher.run()');
      result.assertFileContent('server/src/main.rs', 'CancellationToken');
    });

    it('should include base64, serde_yaml, tokio-util dependencies', () => {
      result.assertFileContent('Cargo.toml', 'base64');
      result.assertFileContent('Cargo.toml', 'serde_yaml');
      result.assertFileContent('Cargo.toml', 'tokio-util');
    });
  });

  describe('monolith should not have external config features', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noConfigApp',
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

    it('should not have config profile env vars', () => {
      result.assertNoFileContent('.env', 'APP_PROFILE');
      result.assertNoFileContent('.env', 'CONSUL_CONFIG_WATCH');
    });

    it('should not generate remote_config or config_watcher', () => {
      result.assertNoFile(['server/src/config/remote_config.rs', 'server/src/config/config_watcher.rs']);
    });

    it('should not have from_consul_and_env', () => {
      result.assertNoFileContent('server/src/config/app_config.rs', 'from_consul_and_env');
    });

    it('should not have Vault env vars', () => {
      result.assertNoFileContent('.env', 'VAULT_ENABLED');
      result.assertNoFileContent('.env', 'VAULT_ADDR');
    });
  });

  // ==================== Vault Secrets Management Tests ====================

  describe('microservice with consul and vault', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'vaultApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          secretsManagement: 'vault',
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

    it('should generate Vault config file', () => {
      result.assertFile('server/src/config/vault_config.rs');
      result.assertFileContent('server/src/config/vault_config.rs', 'pub struct VaultConfig');
      result.assertFileContent('server/src/config/vault_config.rs', 'VAULT_ADDR');
      result.assertFileContent('server/src/config/vault_config.rs', 'auth_method');
      result.assertFileContent('server/src/config/vault_config.rs', 'role_id');
    });

    it('should generate Vault service file', () => {
      result.assertFile('server/src/services/vault_service.rs');
      result.assertFileContent('server/src/services/vault_service.rs', 'pub struct VaultService');
      result.assertFileContent('server/src/services/vault_service.rs', 'fn read_secrets');
      result.assertFileContent('server/src/services/vault_service.rs', 'fn renew_token');
      result.assertFileContent('server/src/services/vault_service.rs', 'fn start_token_renewal');
      result.assertFileContent('server/src/services/vault_service.rs', 'approle_login_static');
    });

    it('should include Vault in config/mod.rs', () => {
      result.assertFileContent('server/src/config/mod.rs', 'mod vault_config;');
      result.assertFileContent('server/src/config/mod.rs', 'pub use vault_config::*;');
    });

    it('should include Vault in services/mod.rs', () => {
      result.assertFileContent('server/src/services/mod.rs', 'mod vault_service;');
      result.assertFileContent('server/src/services/mod.rs', 'pub use vault_service::{VaultService, VaultError};');
    });

    it('should include Vault in AppState', () => {
      result.assertFileContent('server/src/lib.rs', 'use services::VaultService;');
      result.assertFileContent('server/src/lib.rs', 'pub vault_service: Option<Arc<VaultService>>');
    });

    it('should include Vault environment variables in .env', () => {
      result.assertFileContent('.env', 'VAULT_ENABLED=true');
      result.assertFileContent('.env', 'VAULT_ADDR=http://localhost:8200');
      result.assertFileContent('.env', 'VAULT_AUTH_METHOD=token');
      result.assertFileContent('.env', 'VAULT_TOKEN=myroot');
      result.assertFileContent('.env', 'VAULT_SECRET_PATH=secret/data/vaultapp');
    });

    it('should initialize Vault in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'VaultConfig::from_env()');
      result.assertFileContent('server/src/main.rs', 'VaultService::new');
      result.assertFileContent('server/src/main.rs', 'read_default_secrets');
      result.assertFileContent('server/src/main.rs', 'start_token_renewal');
    });
  });

  describe('microservice with consul but without vault', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noVaultApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          secretsManagement: 'no',
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

    it('should not generate Vault files', () => {
      result.assertNoFile(['server/src/config/vault_config.rs', 'server/src/services/vault_service.rs']);
    });

    it('should not include Vault environment variables in .env', () => {
      result.assertNoFileContent('.env', 'VAULT_ENABLED');
      result.assertNoFileContent('.env', 'VAULT_ADDR');
    });

    it('should not include Vault in lib.rs', () => {
      result.assertNoFileContent('server/src/lib.rs', 'VaultService');
    });

    it('should not include Vault initialization in main.rs', () => {
      result.assertNoFileContent('server/src/main.rs', 'VaultConfig');
    });
  });

  // ==================== External Config Optional Tests ====================

  describe('microservice with consul but external config disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noExtConfigApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
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

    // Service discovery files SHOULD be generated
    it('should generate consul_config.rs', () => {
      result.assertFile('server/src/config/consul_config.rs');
    });

    it('should generate consul_service.rs', () => {
      result.assertFile('server/src/services/consul_service.rs');
    });

    it('should include ConsulService in lib.rs', () => {
      result.assertFileContent('server/src/lib.rs', 'use services::ConsulService;');
      result.assertFileContent('server/src/lib.rs', 'pub consul_service: Option<Arc<ConsulService>>');
    });

    it('should include consul_config in config/mod.rs', () => {
      result.assertFileContent('server/src/config/mod.rs', 'mod consul_config;');
      result.assertFileContent('server/src/config/mod.rs', 'pub use consul_config::*;');
    });

    it('should include consul service discovery env vars in .env', () => {
      result.assertFileContent('.env', 'CONSUL_HOST=localhost');
      result.assertFileContent('.env', 'CONSUL_PORT=8500');
      result.assertFileContent('.env', 'CONSUL_SERVICE_NAME=noextconfigapp');
      result.assertFileContent('.env', 'CONSUL_REGISTER_SERVICE=true');
    });

    // External config files should NOT be generated
    it('should NOT generate remote_config.rs', () => {
      result.assertNoFile('server/src/config/remote_config.rs');
    });

    it('should NOT generate config_watcher.rs', () => {
      result.assertNoFile('server/src/config/config_watcher.rs');
    });

    it('should NOT include remote_config or config_watcher in config/mod.rs', () => {
      result.assertNoFileContent('server/src/config/mod.rs', 'mod remote_config;');
      result.assertNoFileContent('server/src/config/mod.rs', 'mod config_watcher;');
    });

    it('should NOT include SharedRemoteConfig in lib.rs', () => {
      result.assertNoFileContent('server/src/lib.rs', 'SharedRemoteConfig');
    });

    it('should NOT include from_consul_and_env in app_config.rs', () => {
      result.assertNoFileContent('server/src/config/app_config.rs', 'from_consul_and_env');
    });

    it('should use AppConfig::from_env() in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'AppConfig::from_env()');
      result.assertNoFileContent('server/src/main.rs', 'AppConfig::from_consul_and_env');
    });

    it('should NOT include external config env vars in .env', () => {
      result.assertNoFileContent('.env', 'APP_PROFILE');
      result.assertNoFileContent('.env', 'CONSUL_CONFIG_WATCH_ENABLED');
      result.assertNoFileContent('.env', 'CONSUL_CONFIG_WATCH_INTERVAL');
      result.assertNoFileContent('.env', 'CONSUL_ENABLE_CONFIG');
    });

    it('should NOT include ConfigWatcher in main.rs', () => {
      result.assertNoFileContent('server/src/main.rs', 'ConfigWatcher');
    });

    it('should NOT generate Vault files (vault depends on external config)', () => {
      result.assertNoFile(['server/src/config/vault_config.rs', 'server/src/services/vault_service.rs']);
    });

    it('should NOT include external config dependencies in Cargo.toml', () => {
      result.assertNoFileContent('Cargo.toml', 'serde_yaml');
      result.assertNoFileContent('Cargo.toml', 'tokio-util');
    });

    it('should include service discovery dependencies in Cargo.toml', () => {
      result.assertFileContent('Cargo.toml', 'hostname');
      result.assertFileContent('Cargo.toml', 'base64');
    });
  });

  describe('gateway with consul but external config disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'gwNoExtConfig',
          applicationType: 'gateway',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
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

    // Service discovery files SHOULD be generated
    it('should generate consul_config.rs and consul_service.rs', () => {
      result.assertFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs']);
    });

    // External config files should NOT be generated
    it('should NOT generate remote_config.rs or config_watcher.rs', () => {
      result.assertNoFile(['server/src/config/remote_config.rs', 'server/src/config/config_watcher.rs']);
    });

    it('should NOT include from_consul_and_env', () => {
      result.assertNoFileContent('server/src/config/app_config.rs', 'from_consul_and_env');
    });

    it('should use AppConfig::from_env() in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'AppConfig::from_env()');
    });

    it('should include consul service discovery env vars but NOT config env vars', () => {
      result.assertFileContent('.env', 'CONSUL_HOST=localhost');
      result.assertNoFileContent('.env', 'APP_PROFILE');
      result.assertNoFileContent('.env', 'CONSUL_CONFIG_WATCH_ENABLED');
    });
  });

  describe('microservice with consul and external config explicitly enabled', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'extConfigApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: true,
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

    it('should generate all consul and external config files', () => {
      result.assertFile([
        'server/src/config/consul_config.rs',
        'server/src/config/remote_config.rs',
        'server/src/config/config_watcher.rs',
        'server/src/services/consul_service.rs',
      ]);
    });

    it('should include from_consul_and_env in app_config.rs', () => {
      result.assertFileContent('server/src/config/app_config.rs', 'fn from_consul_and_env');
    });

    it('should use AppConfig::from_consul_and_env in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'AppConfig::from_consul_and_env');
    });

    it('should include all config env vars in .env', () => {
      result.assertFileContent('.env', 'CONSUL_HOST=localhost');
      result.assertFileContent('.env', 'APP_PROFILE=dev');
      result.assertFileContent('.env', 'CONSUL_CONFIG_WATCH_ENABLED=true');
    });

    it('should include SharedRemoteConfig in lib.rs', () => {
      result.assertFileContent('server/src/lib.rs', 'SharedRemoteConfig');
    });

    it('should include ConfigWatcher in main.rs', () => {
      result.assertFileContent('server/src/main.rs', 'ConfigWatcher::new');
    });
  });

  describe('microservice with consul, external config disabled, vault requested', () => {
    beforeAll(async function () {
      await helpers
        .run(SUB_GENERATOR_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'vaultNoExtConfig',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
          secretsManagement: 'vault',
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

    it('should NOT generate Vault files (vault requires external config)', () => {
      result.assertNoFile(['server/src/config/vault_config.rs', 'server/src/services/vault_service.rs']);
    });

    it('should NOT include Vault env vars', () => {
      result.assertNoFileContent('.env', 'VAULT_ENABLED');
      result.assertNoFileContent('.env', 'VAULT_ADDR');
    });

    it('should NOT include Vault in lib.rs', () => {
      result.assertNoFileContent('server/src/lib.rs', 'VaultService');
    });

    it('should generate consul service discovery files', () => {
      result.assertFile(['server/src/config/consul_config.rs', 'server/src/services/consul_service.rs']);
    });
  });
});
