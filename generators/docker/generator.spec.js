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

  describe('microservice with consul config profiles', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'configApp',
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

    it('should generate profile-specific central server config files', () => {
      result.assertFile([
        'docker/central-server-config/application.yml',
        'docker/central-server-config/application-dev.yml',
        'docker/central-server-config/application-prod.yml',
      ]);
    });

    it('should include dev profile settings', () => {
      result.assertFileContent('docker/central-server-config/application-dev.yml', 'level: debug');
      result.assertFileContent('docker/central-server-config/application-dev.yml', 'pool_size: 5');
    });

    it('should include prod profile settings', () => {
      result.assertFileContent('docker/central-server-config/application-prod.yml', 'level: info');
      result.assertFileContent('docker/central-server-config/application-prod.yml', 'pool_size: 20');
    });
  });

  describe('microservice with consul and vault', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'vaultApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          secretsManagement: 'vault',
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

    it('should generate Vault docker files', () => {
      result.assertFile(['docker/vault.yml', 'docker/vault-init/vault-init.sh']);
    });

    it('should include Vault server configuration', () => {
      result.assertFileContent('docker/vault.yml', 'hashicorp/vault');
      result.assertFileContent('docker/vault.yml', 'VAULT_DEV_ROOT_TOKEN_ID=myroot');
    });

    it('should include vault-init script with AppRole setup', () => {
      result.assertFileContent('docker/vault-init/vault-init.sh', 'vault secrets enable');
      result.assertFileContent('docker/vault-init/vault-init.sh', 'vault auth enable approle');
      result.assertFileContent('docker/vault-init/vault-init.sh', 'vault policy write');
      result.assertFileContent('docker/vault-init/vault-init.sh', 'vaultapp-policy');
    });
  });

  describe('microservice without vault', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noVaultApp',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          secretsManagement: 'no',
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

    it('should not generate Vault docker files', () => {
      result.assertNoFile(['docker/vault.yml', 'docker/vault-init/vault-init.sh']);
    });
  });

  // ==================== External Config Optional Tests ====================

  describe('microservice with consul but external config disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noExtDocker',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
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

    it('should generate consul.yml', () => {
      result.assertFile('docker/consul.yml');
    });

    it('should NOT generate central-server-config files', () => {
      result.assertNoFile(['docker/central-server-config/application-dev.yml', 'docker/central-server-config/application-prod.yml']);
    });

    it('should NOT generate Vault docker files', () => {
      result.assertNoFile(['docker/vault.yml', 'docker/vault-init/vault-init.sh']);
    });
  });
});
