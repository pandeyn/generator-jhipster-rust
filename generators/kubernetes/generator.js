import KubernetesGenerator from 'generator-jhipster/generators/kubernetes';
import { kubernetesFiles } from './files.js';

export default class extends KubernetesGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      checkBlueprint: true,
    });
  }

  async beforeQueue() {
    await super.beforeQueue();
  }

  get [KubernetesGenerator.INITIALIZING]() {
    return {
      ...super.initializing,
    };
  }

  get [KubernetesGenerator.PROMPTING]() {
    return {
      async askForKubernetesConfig() {
        // Skip prompts if all K8s config is already set (e.g., test environment or re-run)
        if (
          this.jhipsterConfig.kubernetesNamespace !== undefined &&
          this.jhipsterConfig.kubernetesServiceType !== undefined &&
          this.jhipsterConfig.ingressType !== undefined
        ) {
          return;
        }

        const prompts = [
          {
            type: 'input',
            name: 'kubernetesNamespace',
            message: 'What should we use for the Kubernetes namespace?',
            default: this.jhipsterConfig.kubernetesNamespace || 'default',
          },
          {
            type: 'list',
            name: 'kubernetesServiceType',
            message: 'What should we use for the Kubernetes service type?',
            choices: [
              { value: 'ClusterIP', name: 'ClusterIP (internal access only)' },
              { value: 'NodePort', name: 'NodePort (expose on node port)' },
              { value: 'LoadBalancer', name: 'LoadBalancer (cloud provider LB)' },
              { value: 'Ingress', name: 'Ingress (requires ingress controller)' },
            ],
            default: this.jhipsterConfig.kubernetesServiceType || 'ClusterIP',
          },
          {
            when: answers => answers.kubernetesServiceType === 'Ingress',
            type: 'list',
            name: 'ingressType',
            message: 'Which ingress controller do you want to use?',
            choices: [
              { value: 'nginx', name: 'NGINX Ingress Controller' },
              { value: 'traefik', name: 'Traefik Ingress Controller' },
            ],
            default: this.jhipsterConfig.ingressType || 'nginx',
          },
          {
            when: answers => answers.kubernetesServiceType === 'Ingress',
            type: 'input',
            name: 'ingressDomain',
            message: 'What is the root FQDN for your ingress?',
            default: this.jhipsterConfig.ingressDomain || 'example.com',
          },
          {
            type: 'input',
            name: 'dockerRegistryUrl',
            message: 'What Docker registry URL do you want to use? (leave empty for local images)',
            default: this.jhipsterConfig.dockerRegistryUrl || '',
          },
        ];

        const answers = await this.prompt(prompts);

        this.jhipsterConfig.kubernetesNamespace = answers.kubernetesNamespace;
        this.jhipsterConfig.kubernetesServiceType = answers.kubernetesServiceType;
        if (answers.kubernetesServiceType === 'Ingress') {
          this.jhipsterConfig.ingressType = answers.ingressType;
          this.jhipsterConfig.ingressDomain = answers.ingressDomain;
        } else {
          this.jhipsterConfig.ingressType = 'none';
        }
        this.jhipsterConfig.dockerRegistryUrl = answers.dockerRegistryUrl;
      },
    };
  }

  get [KubernetesGenerator.CONFIGURING]() {
    return {
      ...super.configuring,
    };
  }

  get [KubernetesGenerator.LOADING]() {
    return {
      ...super.loading,
    };
  }

  get [KubernetesGenerator.PREPARING]() {
    return {
      ...super.preparing,
      async preparingRustK8sTask() {
        // Read configuration
        const devDbType = this.jhipsterConfig.devDatabaseType || 'sqlite';
        const authType = this.jhipsterConfig.authenticationType || 'jwt';
        const appType = this.jhipsterConfig.applicationType || 'monolith';
        const serviceDiscoveryType = this.jhipsterConfig.serviceDiscoveryType || 'no';
        const messageBroker = this.jhipsterConfig.messageBroker || 'no';
        const monitoring = this.jhipsterConfig.monitoring || 'no';
        const isMicroservicesApp = appType === 'microservice' || appType === 'gateway';
        const serviceDiscoveryConsul = isMicroservicesApp && serviceDiscoveryType === 'consul';
        const externalConfig = serviceDiscoveryConsul && this.jhipsterConfig.externalConfig !== false;

        // Kubernetes-specific config
        const kubernetesNamespace = this.jhipsterConfig.kubernetesNamespace || this.kubernetesNamespace || 'default';
        const kubernetesServiceType = this.jhipsterConfig.kubernetesServiceType || this.kubernetesServiceType || 'ClusterIP';
        const ingressType = this.jhipsterConfig.ingressType || this.ingressType || 'none';
        const ingressDomain = this.jhipsterConfig.ingressDomain || this.ingressDomain || 'example.com';
        const dockerRegistryUrl = this.jhipsterConfig.dockerRegistryUrl || this.dockerRepositoryName || '';
        const kubernetesReplicas = this.jhipsterConfig.kubernetesReplicas || this.kubernetesReplicas || 1;

        // Store for template context
        this._rustK8sContext = {
          devDatabaseType: devDbType,
          devDatabaseTypeSqlite: devDbType === 'sqlite',
          devDatabaseTypePostgresql: devDbType === 'postgresql',
          devDatabaseTypeMysql: devDbType === 'mysql',
          devDatabaseTypeMongodb: devDbType === 'mongodb',
          authenticationTypeJwt: authType === 'jwt',
          authenticationTypeOauth2: authType === 'oauth2',
          serviceDiscoveryConsul,
          externalConfig,
          secretsManagementVault: externalConfig && (this.jhipsterConfig.secretsManagement || 'no') === 'vault',
          messageBrokerKafka: messageBroker === 'kafka',
          applicationTypeMicroservice: appType === 'microservice',
          appPort: appType === 'microservice' ? 8081 : 8080,
          monitoringPrometheus: monitoring === 'prometheus',
          distributedTracingZipkin: isMicroservicesApp && (this.jhipsterConfig.distributedTracing || 'no') === 'zipkin',
          distributedTracingJaeger: isMicroservicesApp && (this.jhipsterConfig.distributedTracing || 'no') === 'jaeger',
          distributedTracingAny: isMicroservicesApp && (this.jhipsterConfig.distributedTracing || 'no') !== 'no',
          kubernetesNamespace,
          kubernetesServiceType,
          ingressType,
          ingressEnabled: ingressType !== 'none',
          ingressNginx: ingressType === 'nginx',
          ingressTraefik: ingressType === 'traefik',
          ingressDomain,
          dockerRegistryUrl,
          kubernetesReplicas,
        };
      },
    };
  }

  get [KubernetesGenerator.WRITING]() {
    // Fully override the parent's writing phase — do not spread super.writing
    return {
      async writingRustK8sTemplates() {
        const baseName = this.jhipsterConfig.baseName || 'app';
        const dockerRegistryUrl = this._rustK8sContext.dockerRegistryUrl || '';
        const registryPrefix = dockerRegistryUrl ? `${dockerRegistryUrl}/` : '';

        const context = {
          baseName,
          dockerImageName: `${registryPrefix}${baseName.toLowerCase()}`,
          ...this._rustK8sContext,
        };

        await this.writeFiles({
          sections: kubernetesFiles,
          context,
        });
      },
    };
  }

  get [KubernetesGenerator.END]() {
    // Fully override the parent's end phase — suppress stale messages and chmod
    return {
      async logRustK8sSuccess() {
        this.log.verboseInfo('\nKubernetes configuration successfully generated!');
        this.log.log('\nDeploy your application with:');
        this.log.verboseInfo('  ./k8s/kubectl-apply.sh apply');
        this.log.log('\nTear down with:');
        this.log.verboseInfo('  ./k8s/kubectl-apply.sh delete');
      },
      async makeScriptsExecutable() {
        const scriptPath = this.destinationPath('k8s/kubectl-apply.sh');
        try {
          const { chmod } = await import('node:fs/promises');
          await chmod(scriptPath, 0o755);
        } catch {
          // Ignore if file doesn't exist yet
        }
      },
    };
  }
}
