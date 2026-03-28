import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'kubernetes-helm';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

const defaultHelmConfig = {
  kubernetesNamespace: 'default',
  kubernetesServiceType: 'ClusterIP',
  ingressType: 'none',
  ingressDomain: 'example.com',
  dockerRegistryUrl: '',
  helmChartVersion: '0.1.0',
  helmEnableHpa: false,
};

describe('SubGenerator helm of rust JHipster blueprint', () => {
  describe('run with defaults (sqlite)', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'myApp',
          skipClient: true,
          ...defaultHelmConfig,
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

    it('should generate Chart.yaml', () => {
      result.assertFile('helm/myapp/Chart.yaml');
      result.assertFileContent('helm/myapp/Chart.yaml', 'name: myapp');
      result.assertFileContent('helm/myapp/Chart.yaml', 'version: 0.1.0');
    });

    it('should generate values.yaml', () => {
      result.assertFile('helm/myapp/values.yaml');
      result.assertFileContent('helm/myapp/values.yaml', 'repository: myapp');
    });

    it('should generate core templates', () => {
      result.assertFile([
        'helm/myapp/templates/_helpers.tpl',
        'helm/myapp/templates/deployment.yaml',
        'helm/myapp/templates/service.yaml',
        'helm/myapp/templates/configmap.yaml',
        'helm/myapp/templates/secret.yaml',
        'helm/myapp/templates/NOTES.txt',
      ]);
    });

    it('should generate helper scripts', () => {
      result.assertFile(['helm/helm-apply.sh', 'helm/README-helm.md']);
    });

    it('should not generate database templates for sqlite', () => {
      result.assertNoFile([
        'helm/myapp/templates/postgresql-statefulset.yaml',
        'helm/myapp/templates/mysql-statefulset.yaml',
        'helm/myapp/templates/mongodb-statefulset.yaml',
      ]);
    });

    it('should not generate ingress template', () => {
      result.assertNoFile('helm/myapp/templates/ingress.yaml');
    });

    it('should not generate HPA template', () => {
      result.assertNoFile('helm/myapp/templates/hpa.yaml');
    });

    it('should use Helm template syntax in deployment', () => {
      result.assertFileContent('helm/myapp/templates/deployment.yaml', '{{ .Values.image.repository }}');
      result.assertFileContent('helm/myapp/templates/deployment.yaml', '{{ .Values.replicaCount }}');
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
          ...defaultHelmConfig,
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

    it('should generate PostgreSQL template', () => {
      result.assertFile('helm/pgapp/templates/postgresql-statefulset.yaml');
    });

    it('should include PostgreSQL config in values', () => {
      result.assertFileContent('helm/pgapp/values.yaml', 'postgresql:');
      result.assertFileContent('helm/pgapp/values.yaml', 'DATABASE_URL');
    });

    it('should not generate other database templates', () => {
      result.assertNoFile(['helm/pgapp/templates/mysql-statefulset.yaml', 'helm/pgapp/templates/mongodb-statefulset.yaml']);
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
          ...defaultHelmConfig,
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

    it('should generate MySQL template', () => {
      result.assertFile('helm/mysqlapp/templates/mysql-statefulset.yaml');
    });

    it('should not generate other database templates', () => {
      result.assertNoFile(['helm/mysqlapp/templates/postgresql-statefulset.yaml', 'helm/mysqlapp/templates/mongodb-statefulset.yaml']);
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
          ...defaultHelmConfig,
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

    it('should generate MongoDB template', () => {
      result.assertFile('helm/mongoapp/templates/mongodb-statefulset.yaml');
    });

    it('should include MongoDB init job as Helm hook', () => {
      result.assertFileContent('helm/mongoapp/templates/mongodb-statefulset.yaml', 'helm.sh/hook');
    });

    it('should include MongoDB config in values', () => {
      result.assertFileContent('helm/mongoapp/values.yaml', 'MONGODB_URI');
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
          ...defaultHelmConfig,
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

    it('should generate Keycloak template', () => {
      result.assertFile('helm/oauthapp/templates/keycloak-deployment.yaml');
    });

    it('should include Keycloak config in values', () => {
      result.assertFileContent('helm/oauthapp/values.yaml', 'keycloak:');
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
          ...defaultHelmConfig,
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

    it('should generate Consul template', () => {
      result.assertFile('helm/microapp/templates/consul-statefulset.yaml');
    });

    it('should generate Kafka template', () => {
      result.assertFile('helm/microapp/templates/kafka-statefulset.yaml');
    });

    it('should include Consul and Kafka in values', () => {
      result.assertFileContent('helm/microapp/values.yaml', 'consul:');
      result.assertFileContent('helm/microapp/values.yaml', 'kafka:');
      result.assertFileContent('helm/microapp/values.yaml', 'CONSUL_HOST');
      result.assertFileContent('helm/microapp/values.yaml', 'KAFKA_BOOTSTRAP_SERVERS');
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
          ...defaultHelmConfig,
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

    it('should generate monitoring template', () => {
      result.assertFile('helm/monitorapp/templates/monitoring.yaml');
    });

    it('should include Prometheus and Grafana in values', () => {
      result.assertFileContent('helm/monitorapp/values.yaml', 'prometheus:');
      result.assertFileContent('helm/monitorapp/values.yaml', 'grafana:');
    });

    it('should include Prometheus annotations on deployment', () => {
      result.assertFileContent('helm/monitorapp/templates/deployment.yaml', 'prometheus.io/scrape');
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
          ...defaultHelmConfig,
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

    it('should generate Ingress template', () => {
      result.assertFile('helm/ingressapp/templates/ingress.yaml');
    });

    it('should include ingress enabled in values', () => {
      result.assertFileContent('helm/ingressapp/values.yaml', 'ingress:');
      result.assertFileContent('helm/ingressapp/values.yaml', 'enabled: true');
      result.assertFileContent('helm/ingressapp/values.yaml', 'className: nginx');
    });
  });

  describe('monolith with HPA enabled', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'hpaApp',
          applicationType: 'monolith',
          skipClient: true,
          ...defaultHelmConfig,
          helmEnableHpa: true,
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

    it('should generate HPA template', () => {
      result.assertFile('helm/hpaapp/templates/hpa.yaml');
    });

    it('should include autoscaling enabled in values', () => {
      result.assertFileContent('helm/hpaapp/values.yaml', 'autoscaling:');
      result.assertFileContent('helm/hpaapp/values.yaml', 'enabled: true');
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
          ...defaultHelmConfig,
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

    it('should generate Consul config loader Helm templates', () => {
      result.assertFile(['helm/configapp/templates/consul-config-configmap.yaml', 'helm/configapp/templates/consul-config-job.yaml']);
    });

    it('should include Helm guards in config loader templates', () => {
      result.assertFileContent('helm/configapp/templates/consul-config-configmap.yaml', '{{- if .Values.consul.enabled }}');
      result.assertFileContent('helm/configapp/templates/consul-config-job.yaml', '{{- if .Values.consul.enabled }}');
    });

    it('should use Deployment for config loader (long-running process)', () => {
      result.assertFileContent('helm/configapp/templates/consul-config-job.yaml', 'kind: Deployment');
      result.assertFileContent('helm/configapp/templates/consul-config-job.yaml', 'replicas: 1');
    });

    it('should include profile-specific configs in configmap', () => {
      result.assertFileContent('helm/configapp/templates/consul-config-configmap.yaml', 'application-dev.yml');
      result.assertFileContent('helm/configapp/templates/consul-config-configmap.yaml', 'application-prod.yml');
    });

    it('should include APP_PROFILE in values.yaml', () => {
      result.assertFileContent('helm/configapp/values.yaml', 'APP_PROFILE');
      result.assertFileContent('helm/configapp/values.yaml', 'CONSUL_CONFIG_WATCH_ENABLED');
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
          ...defaultHelmConfig,
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

    it('should generate Vault Helm templates', () => {
      result.assertFile([
        'helm/vaultapp/templates/vault-statefulset.yaml',
        'helm/vaultapp/templates/vault-init-job.yaml',
        'helm/vaultapp/templates/vault-secret.yaml',
      ]);
    });

    it('should include Helm guards on Vault templates', () => {
      result.assertFileContent('helm/vaultapp/templates/vault-statefulset.yaml', '{{- if .Values.vault.enabled }}');
      result.assertFileContent('helm/vaultapp/templates/vault-init-job.yaml', '{{- if .Values.vault.enabled }}');
      result.assertFileContent('helm/vaultapp/templates/vault-secret.yaml', '{{- if .Values.vault.enabled }}');
    });

    it('should not use Helm hooks on vault init job (runs as regular resource)', () => {
      result.assertNoFileContent('helm/vaultapp/templates/vault-init-job.yaml', 'helm.sh/hook');
    });

    it('should include vault section in values.yaml', () => {
      result.assertFileContent('helm/vaultapp/values.yaml', 'vault:');
      result.assertFileContent('helm/vaultapp/values.yaml', 'enabled: true');
      result.assertFileContent('helm/vaultapp/values.yaml', 'storage: 1Gi');
    });

    it('should reference vault-secret in deployment', () => {
      result.assertFileContent('helm/vaultapp/templates/deployment.yaml', 'vault-secret');
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
          ...defaultHelmConfig,
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

    it('should not generate Vault Helm templates', () => {
      result.assertNoFile([
        'helm/novaultapp/templates/vault-statefulset.yaml',
        'helm/novaultapp/templates/vault-init-job.yaml',
        'helm/novaultapp/templates/vault-secret.yaml',
      ]);
    });

    it('should not include vault section in values.yaml', () => {
      result.assertNoFileContent('helm/novaultapp/values.yaml', 'vault:');
    });

    it('should not reference vault-secret in deployment', () => {
      result.assertNoFileContent('helm/novaultapp/templates/deployment.yaml', 'vault-secret');
    });
  });

  // ==================== External Config Optional Tests ====================

  describe('microservice with consul but external config disabled', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'noExtHelm',
          applicationType: 'microservice',
          skipClient: true,
          serviceDiscoveryType: 'consul',
          externalConfig: false,
          ...defaultHelmConfig,
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

    it('should generate consul-statefulset.yaml', () => {
      result.assertFile('helm/noexthelm/templates/consul-statefulset.yaml');
    });

    it('should NOT generate consul-config-configmap.yaml or consul-config-job.yaml', () => {
      result.assertNoFile(['helm/noexthelm/templates/consul-config-configmap.yaml', 'helm/noexthelm/templates/consul-config-job.yaml']);
    });

    it('should include consul service discovery vars in values.yaml', () => {
      result.assertFileContent('helm/noexthelm/values.yaml', 'CONSUL_HOST');
      result.assertFileContent('helm/noexthelm/values.yaml', 'CONSUL_PORT');
      result.assertFileContent('helm/noexthelm/values.yaml', 'CONSUL_REGISTER_SERVICE');
      result.assertFileContent('helm/noexthelm/values.yaml', 'APP_ENV');
    });

    it('should NOT include external config vars in values.yaml', () => {
      result.assertNoFileContent('helm/noexthelm/values.yaml', 'APP_PROFILE');
      result.assertNoFileContent('helm/noexthelm/values.yaml', 'CONSUL_CONFIG_WATCH_ENABLED');
      result.assertNoFileContent('helm/noexthelm/values.yaml', 'CONSUL_CONFIG_WATCH_INTERVAL');
    });

    it('should NOT generate vault files', () => {
      result.assertNoFile([
        'helm/noexthelm/templates/vault-statefulset.yaml',
        'helm/noexthelm/templates/vault-init-job.yaml',
        'helm/noexthelm/templates/vault-secret.yaml',
      ]);
    });
  });
});
