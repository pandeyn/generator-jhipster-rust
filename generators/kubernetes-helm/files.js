export const helmChartFiles = ['Chart.yaml', 'values.yaml', 'helmignore'];

export const helmTemplateFiles = [
  'templates/_helpers.tpl',
  'templates/NOTES.txt',
  'templates/deployment.yaml',
  'templates/service.yaml',
  'templates/configmap.yaml',
  'templates/secret.yaml',
];

export const helmConditionalTemplateFiles = {
  ingress: { condition: ctx => ctx.ingressEnabled, file: 'templates/ingress.yaml' },
  hpa: { condition: ctx => ctx.helmEnableHpa, file: 'templates/hpa.yaml' },
  namespace: { condition: ctx => ctx.kubernetesNamespace !== 'default', file: 'templates/namespace.yaml' },
  postgresql: { condition: ctx => ctx.devDatabaseTypePostgresql, file: 'templates/postgresql-statefulset.yaml' },
  mysql: { condition: ctx => ctx.devDatabaseTypeMysql, file: 'templates/mysql-statefulset.yaml' },
  mongodb: { condition: ctx => ctx.devDatabaseTypeMongodb, file: 'templates/mongodb-statefulset.yaml' },
  keycloak: { condition: ctx => ctx.authenticationTypeOauth2, file: 'templates/keycloak-deployment.yaml' },
  consul: { condition: ctx => ctx.serviceDiscoveryConsul, file: 'templates/consul-statefulset.yaml' },
  consulConfigConfigmap: { condition: ctx => ctx.externalConfig, file: 'templates/consul-config-configmap.yaml' },
  consulConfigJob: { condition: ctx => ctx.externalConfig, file: 'templates/consul-config-job.yaml' },
  vault: { condition: ctx => ctx.secretsManagementVault, file: 'templates/vault-statefulset.yaml' },
  vaultInitJob: { condition: ctx => ctx.secretsManagementVault, file: 'templates/vault-init-job.yaml' },
  vaultSecret: { condition: ctx => ctx.secretsManagementVault, file: 'templates/vault-secret.yaml' },
  kafka: { condition: ctx => ctx.messageBrokerKafka, file: 'templates/kafka-statefulset.yaml' },
  monitoring: { condition: ctx => ctx.monitoringPrometheus, file: 'templates/monitoring.yaml' },
  tracing: { condition: ctx => ctx.distributedTracingAny, file: 'templates/tracing.yaml' },
};

export const helmScriptFiles = ['helm-apply.sh', 'README-helm.md'];
