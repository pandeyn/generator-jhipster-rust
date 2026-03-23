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
      ...super.prompting,
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
          serviceDiscoveryConsul: (appType === 'microservice' || appType === 'gateway') && serviceDiscoveryType === 'consul',
          messageBrokerKafka: messageBroker === 'kafka',
          monitoringPrometheus: monitoring === 'prometheus',
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
