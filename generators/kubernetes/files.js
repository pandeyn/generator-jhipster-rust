export const kubernetesFiles = {
  namespace: [
    {
      condition: ctx => ctx.kubernetesNamespace !== 'default',
      path: 'k8s/',
      templates: ['namespace.yml'],
    },
  ],
  app: [
    {
      path: 'k8s/',
      templates: ['app-deployment.yml', 'app-service.yml', 'app-configmap.yml', 'app-secret.yml'],
    },
  ],
  ingress: [
    {
      condition: ctx => ctx.ingressEnabled,
      path: 'k8s/',
      templates: ['app-ingress.yml'],
    },
  ],
  postgresql: [
    {
      condition: ctx => ctx.devDatabaseTypePostgresql,
      path: 'k8s/',
      templates: ['postgresql-statefulset.yml'],
    },
  ],
  mysql: [
    {
      condition: ctx => ctx.devDatabaseTypeMysql,
      path: 'k8s/',
      templates: ['mysql-statefulset.yml'],
    },
  ],
  mongodb: [
    {
      condition: ctx => ctx.devDatabaseTypeMongodb,
      path: 'k8s/',
      templates: ['mongodb-statefulset.yml'],
    },
  ],
  keycloak: [
    {
      condition: ctx => ctx.authenticationTypeOauth2,
      path: 'k8s/',
      templates: ['keycloak-deployment.yml'],
    },
  ],
  consul: [
    {
      condition: ctx => ctx.serviceDiscoveryConsul,
      path: 'k8s/',
      templates: ['consul-statefulset.yml'],
    },
    {
      condition: ctx => ctx.externalConfig,
      path: 'k8s/',
      templates: ['consul-config-configmap.yml', 'consul-config-job.yml'],
    },
  ],
  vault: [
    {
      condition: ctx => ctx.secretsManagementVault,
      path: 'k8s/',
      templates: ['vault-statefulset.yml', 'vault-init-job.yml', 'vault-secret.yml'],
    },
  ],
  kafka: [
    {
      condition: ctx => ctx.messageBrokerKafka,
      path: 'k8s/',
      templates: ['kafka-statefulset.yml'],
    },
  ],
  monitoring: [
    {
      condition: ctx => ctx.monitoringPrometheus,
      path: 'k8s/',
      templates: ['monitoring.yml'],
    },
  ],
  helpers: [
    {
      path: 'k8s/',
      templates: ['kubectl-apply.sh', 'README-k8s.md'],
    },
  ],
};
