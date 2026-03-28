import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'kubernetes';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

const defaultK8sConfig = {
  kubernetesNamespace: 'default',
  kubernetesServiceType: 'ClusterIP',
  ingressType: 'none',
  ingressDomain: 'example.com',
  dockerRegistryUrl: '',
  kubernetesReplicas: 1,
};

describe('SubGenerator kubernetes of rust JHipster blueprint', () => {
  describe('run with defaults', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'myApp',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate core K8s manifests', () => {
      result.assertFile(['k8s/app-deployment.yml', 'k8s/app-service.yml', 'k8s/app-configmap.yml', 'k8s/app-secret.yml']);
    });

    it('should generate helper files', () => {
      result.assertFile(['k8s/kubectl-apply.sh', 'k8s/README-k8s.md']);
    });

    it('should not generate database manifests for sqlite', () => {
      result.assertNoFile(['k8s/postgresql-statefulset.yml', 'k8s/mysql-statefulset.yml', 'k8s/mongodb-statefulset.yml']);
    });

    it('should include SQLite PVC in app deployment', () => {
      result.assertFileContent('k8s/app-deployment.yml', 'sqlite-pvc');
    });

    it('should include liveness and readiness probes', () => {
      result.assertFileContent('k8s/app-deployment.yml', '/api/health/liveness');
      result.assertFileContent('k8s/app-deployment.yml', '/api/health/readiness');
    });
  });

  describe('monolith with postgresql', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'pgApp',
          applicationType: 'monolith',
          devDatabaseType: 'postgresql',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate PostgreSQL StatefulSet', () => {
      result.assertFile('k8s/postgresql-statefulset.yml');
    });

    it('should include PostgreSQL configuration', () => {
      result.assertFileContent('k8s/postgresql-statefulset.yml', 'postgres:16-alpine');
      result.assertFileContent('k8s/postgresql-statefulset.yml', 'POSTGRES_DB');
    });

    it('should reference PostgreSQL in configmap', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'postgresql:5432');
    });

    it('should not generate other database manifests', () => {
      result.assertNoFile(['k8s/mysql-statefulset.yml', 'k8s/mongodb-statefulset.yml']);
    });
  });

  describe('monolith with mysql', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'mysqlApp',
          applicationType: 'monolith',
          devDatabaseType: 'mysql',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate MySQL StatefulSet', () => {
      result.assertFile('k8s/mysql-statefulset.yml');
    });

    it('should include MySQL configuration', () => {
      result.assertFileContent('k8s/mysql-statefulset.yml', 'mysql:8.0');
      result.assertFileContent('k8s/mysql-statefulset.yml', 'MYSQL_DATABASE');
    });

    it('should not generate other database manifests', () => {
      result.assertNoFile(['k8s/postgresql-statefulset.yml', 'k8s/mongodb-statefulset.yml']);
    });
  });

  describe('monolith with mongodb', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'mongoApp',
          applicationType: 'monolith',
          devDatabaseType: 'mongodb',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate MongoDB StatefulSet', () => {
      result.assertFile('k8s/mongodb-statefulset.yml');
    });

    it('should include MongoDB configuration', () => {
      result.assertFileContent('k8s/mongodb-statefulset.yml', 'mongo:7.0');
    });

    it('should reference MongoDB in configmap', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'MONGODB_URI');
    });

    it('should not generate other database manifests', () => {
      result.assertNoFile(['k8s/postgresql-statefulset.yml', 'k8s/mysql-statefulset.yml']);
    });
  });

  describe('monolith with oauth2', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'oauthApp',
          applicationType: 'monolith',
          authenticationType: 'oauth2',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate Keycloak deployment', () => {
      result.assertFile('k8s/keycloak-deployment.yml');
    });

    it('should include Keycloak configuration', () => {
      result.assertFileContent('k8s/keycloak-deployment.yml', 'keycloak');
      result.assertFileContent('k8s/keycloak-deployment.yml', 'KEYCLOAK_ADMIN');
    });
  });

  describe('microservice with consul and kafka', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'microApp',
          applicationType: 'microservice',
          serviceDiscoveryType: 'consul',
          messageBroker: 'kafka',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate Consul StatefulSet', () => {
      result.assertFile('k8s/consul-statefulset.yml');
    });

    it('should include Consul configuration', () => {
      result.assertFileContent('k8s/consul-statefulset.yml', 'hashicorp/consul');
    });

    it('should reference Consul in configmap', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'CONSUL_HOST');
    });

    it('should generate Kafka StatefulSet', () => {
      result.assertFile('k8s/kafka-statefulset.yml');
    });

    it('should include Kafka configuration', () => {
      result.assertFileContent('k8s/kafka-statefulset.yml', 'cp-kafka');
      result.assertFileContent('k8s/kafka-statefulset.yml', 'cp-zookeeper');
    });

    it('should reference Kafka in configmap', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'KAFKA_BOOTSTRAP_SERVERS');
    });
  });

  describe('monolith with prometheus monitoring', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'monitorApp',
          applicationType: 'monolith',
          monitoring: 'prometheus',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate monitoring manifests', () => {
      result.assertFile('k8s/monitoring.yml');
    });

    it('should include Prometheus and Grafana', () => {
      result.assertFileContent('k8s/monitoring.yml', 'prom/prometheus');
      result.assertFileContent('k8s/monitoring.yml', 'grafana/grafana');
    });

    it('should include Prometheus annotations on app deployment', () => {
      result.assertFileContent('k8s/app-deployment.yml', 'prometheus.io/scrape');
    });
  });

  describe('monolith without ingress', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noIngressApp',
          applicationType: 'monolith',
          skipClient: true,
          ...defaultK8sConfig,
          ingressType: 'none',
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

    it('should not generate Ingress manifest', () => {
      result.assertNoFile('k8s/app-ingress.yml');
    });
  });

  describe('monolith with nginx ingress', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'ingressApp',
          applicationType: 'monolith',
          skipClient: true,
          ...defaultK8sConfig,
          ingressType: 'nginx',
          ingressDomain: 'myapp.example.com',
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

    it('should generate Ingress manifest', () => {
      result.assertFile('k8s/app-ingress.yml');
    });

    it('should include nginx annotations', () => {
      result.assertFileContent('k8s/app-ingress.yml', 'nginx');
    });
  });

  describe('microservice with consul config loader', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'configApp',
          applicationType: 'microservice',
          serviceDiscoveryType: 'consul',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate Consul config loader resources', () => {
      result.assertFile(['k8s/consul-config-configmap.yml', 'k8s/consul-config-job.yml']);
    });

    it('should use Deployment for config loader with consul-config-loader image', () => {
      result.assertFileContent('k8s/consul-config-job.yml', 'kind: Deployment');
      result.assertFileContent('k8s/consul-config-job.yml', 'jhipster/consul-config-loader:v0.4.1');
    });

    it('should include profile-specific configs in configmap', () => {
      result.assertFileContent('k8s/consul-config-configmap.yml', 'application-dev.yml');
      result.assertFileContent('k8s/consul-config-configmap.yml', 'application-prod.yml');
    });

    it('should include APP_PROFILE in app configmap', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'APP_PROFILE');
      result.assertFileContent('k8s/app-configmap.yml', 'CONSUL_CONFIG_WATCH_ENABLED');
    });

    it('should include config loader in kubectl-apply.sh', () => {
      result.assertFileContent('k8s/kubectl-apply.sh', 'consul-config-configmap.yml');
      result.assertFileContent('k8s/kubectl-apply.sh', 'consul-config-job.yml');
      result.assertFileContent('k8s/kubectl-apply.sh', 'consul-config-loader');
      result.assertFileContent('k8s/kubectl-apply.sh', 'rollout status deployment');
    });
  });

  describe('microservice with consul and vault', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'vaultApp',
          applicationType: 'microservice',
          serviceDiscoveryType: 'consul',
          secretsManagement: 'vault',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should generate Vault K8s resources', () => {
      result.assertFile(['k8s/vault-statefulset.yml', 'k8s/vault-init-job.yml', 'k8s/vault-secret.yml']);
    });

    it('should include Vault image in statefulset', () => {
      result.assertFileContent('k8s/vault-statefulset.yml', 'hashicorp/vault:1.15');
    });

    it('should include Vault init with AppRole setup', () => {
      result.assertFileContent('k8s/vault-init-job.yml', 'vault auth enable approle');
      result.assertFileContent('k8s/vault-init-job.yml', 'vault kv put');
    });

    it('should reference vault-secret in app deployment', () => {
      result.assertFileContent('k8s/app-deployment.yml', 'vault-secret');
    });

    it('should include Vault in kubectl-apply.sh', () => {
      result.assertFileContent('k8s/kubectl-apply.sh', 'vault-statefulset.yml');
      result.assertFileContent('k8s/kubectl-apply.sh', 'vault-init-job.yml');
      result.assertFileContent('k8s/kubectl-apply.sh', 'vault-secret.yml');
    });

    it('should conditionally handle JWT_SECRET in app-secret', () => {
      result.assertFileContent('k8s/app-secret.yml', 'managed by Vault');
      result.assertNoFileContent('k8s/app-secret.yml', 'your-super-secret-jwt-key');
    });
  });

  describe('microservice with consul but without vault', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noVaultApp',
          applicationType: 'microservice',
          serviceDiscoveryType: 'consul',
          secretsManagement: 'no',
          skipClient: true,
          ...defaultK8sConfig,
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

    it('should not generate Vault K8s resources', () => {
      result.assertNoFile(['k8s/vault-statefulset.yml', 'k8s/vault-init-job.yml', 'k8s/vault-secret.yml']);
    });

    it('should not reference vault-secret in app deployment', () => {
      result.assertNoFileContent('k8s/app-deployment.yml', 'vault-secret');
    });

    it('should include JWT_SECRET in app-secret normally', () => {
      result.assertFileContent('k8s/app-secret.yml', 'JWT_SECRET');
    });
  });

  // ==================== External Config Optional Tests ====================

  describe('microservice with consul but external config disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noExtK8s',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
          ...defaultK8sConfig,
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

    it('should generate consul-statefulset.yml', () => {
      result.assertFile('k8s/consul-statefulset.yml');
    });

    it('should NOT generate consul-config-configmap.yml or consul-config-job.yml', () => {
      result.assertNoFile(['k8s/consul-config-configmap.yml', 'k8s/consul-config-job.yml']);
    });

    it('should include consul service discovery vars in app-configmap.yml', () => {
      result.assertFileContent('k8s/app-configmap.yml', 'CONSUL_HOST');
      result.assertFileContent('k8s/app-configmap.yml', 'CONSUL_PORT');
      result.assertFileContent('k8s/app-configmap.yml', 'CONSUL_REGISTER_SERVICE');
      result.assertFileContent('k8s/app-configmap.yml', 'APP_ENV');
    });

    it('should NOT include external config vars in app-configmap.yml', () => {
      result.assertNoFileContent('k8s/app-configmap.yml', 'APP_PROFILE');
      result.assertNoFileContent('k8s/app-configmap.yml', 'CONSUL_CONFIG_WATCH_ENABLED');
      result.assertNoFileContent('k8s/app-configmap.yml', 'CONSUL_CONFIG_WATCH_INTERVAL');
    });

    it('should NOT generate vault files', () => {
      result.assertNoFile(['k8s/vault-statefulset.yml', 'k8s/vault-init-job.yml', 'k8s/vault-secret.yml']);
    });
  });
});
