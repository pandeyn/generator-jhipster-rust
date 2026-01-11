import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'docker';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

describe('SubGenerator docker of rust JHipster blueprint', () => {
  describe('run', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig()
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });
  });

  describe('microservice with consul', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'microApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
        })
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should generate Consul docker files', () => {
      result.assertFile(['docker/consul.yml', 'docker/central-server-config/application.yml']);
    });

    it('should include Consul service in app.yml', () => {
      result.assertFileContent('docker/app.yml', 'CONSUL_HOST=consul');
      result.assertFileContent('docker/app.yml', 'consul:');
      result.assertFileContent('docker/app.yml', 'hashicorp/consul');
    });
  });

  describe('monolith without consul', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'monolithApp',
          applicationType: 'monolith',
          skipClient: true,
        })
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should not generate Consul docker files', () => {
      result.assertNoFile(['docker/consul.yml', 'docker/central-server-config/application.yml']);
    });

    it('should not include Consul in app.yml', () => {
      result.assertNoFileContent('docker/app.yml', 'CONSUL_HOST');
    });
  });

  describe('monolith with kafka', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'kafkaApp',
          applicationType: 'monolith',
          skipClient: true,
          messageBroker: 'kafka',
        })
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should generate Kafka docker files', () => {
      result.assertFile('docker/kafka.yml');
    });

    it('should include Kafka service configuration', () => {
      result.assertFileContent('docker/kafka.yml', 'confluentinc/cp-kafka');
      result.assertFileContent('docker/kafka.yml', 'KAFKA_NODE_ID');
      result.assertFileContent('docker/kafka.yml', 'kafka-ui');
    });
  });

  describe('monolith without kafka', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noKafkaApp',
          applicationType: 'monolith',
          skipClient: true,
          messageBroker: 'no',
        })
        .withOptions({
          ignoreNeedlesError: true,
        })
        .withJHipsterGenerators()
        .withConfiguredBlueprint()
        .withBlueprintConfig();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should not generate Kafka docker files', () => {
      result.assertNoFile('docker/kafka.yml');
    });
  });
});
