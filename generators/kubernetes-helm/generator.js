import KubernetesHelmGenerator from 'generator-jhipster/generators/kubernetes-helm';
import { helmChartFiles, helmConditionalTemplateFiles, helmScriptFiles, helmTemplateFiles } from './files.js';

export default class extends KubernetesHelmGenerator {
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

  get [KubernetesHelmGenerator.INITIALIZING]() {
    return {
      ...super.initializing,
    };
  }

  get [KubernetesHelmGenerator.PROMPTING]() {
    return {
      async askForHelmConfig() {
        // Skip prompts if all K8s config is already set
        if (
          this.jhipsterConfig.kubernetesNamespace !== undefined &&
          this.jhipsterConfig.kubernetesServiceType !== undefined &&
          this.jhipsterConfig.ingressType !== undefined &&
          this.jhipsterConfig.helmChartVersion !== undefined
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
          {
            type: 'input',
            name: 'helmChartVersion',
            message: 'What version should the Helm chart use?',
            default: this.jhipsterConfig.helmChartVersion || '0.1.0',
          },
          {
            type: 'confirm',
            name: 'helmEnableHpa',
            message: 'Do you want to enable Horizontal Pod Autoscaler (HPA)?',
            default: this.jhipsterConfig.helmEnableHpa || false,
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
        this.jhipsterConfig.helmChartVersion = answers.helmChartVersion;
        this.jhipsterConfig.helmEnableHpa = answers.helmEnableHpa;
      },
    };
  }

  get [KubernetesHelmGenerator.CONFIGURING]() {
    return {
      ...super.configuring,
    };
  }

  get [KubernetesHelmGenerator.LOADING]() {
    return {
      ...super.loading,
    };
  }

  get [KubernetesHelmGenerator.PREPARING]() {
    return {
      ...super.preparing,
      async preparingRustHelmTask() {
        const devDbType = this.jhipsterConfig.devDatabaseType || 'sqlite';
        const authType = this.jhipsterConfig.authenticationType || 'jwt';
        const appType = this.jhipsterConfig.applicationType || 'monolith';
        const serviceDiscoveryType = this.jhipsterConfig.serviceDiscoveryType || 'no';
        const messageBroker = this.jhipsterConfig.messageBroker || 'no';
        const monitoring = this.jhipsterConfig.monitoring || 'no';

        const kubernetesNamespace = this.jhipsterConfig.kubernetesNamespace || 'default';
        const kubernetesServiceType = this.jhipsterConfig.kubernetesServiceType || 'ClusterIP';
        const ingressType = this.jhipsterConfig.ingressType || 'none';
        const ingressDomain = this.jhipsterConfig.ingressDomain || 'example.com';
        const dockerRegistryUrl = this.jhipsterConfig.dockerRegistryUrl || '';
        const helmChartVersion = this.jhipsterConfig.helmChartVersion || '0.1.0';
        const helmEnableHpa = this.jhipsterConfig.helmEnableHpa || false;

        this._rustHelmContext = {
          devDatabaseType: devDbType,
          devDatabaseTypeSqlite: devDbType === 'sqlite',
          devDatabaseTypePostgresql: devDbType === 'postgresql',
          devDatabaseTypeMysql: devDbType === 'mysql',
          devDatabaseTypeMongodb: devDbType === 'mongodb',
          authenticationTypeJwt: authType === 'jwt',
          authenticationTypeOauth2: authType === 'oauth2',
          serviceDiscoveryConsul: (appType === 'microservice' || appType === 'gateway') && serviceDiscoveryType === 'consul',
          secretsManagementVault:
            (appType === 'microservice' || appType === 'gateway') &&
            serviceDiscoveryType === 'consul' &&
            (this.jhipsterConfig.secretsManagement || 'no') === 'vault',
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
          helmChartVersion,
          helmEnableHpa,
        };
      },
    };
  }

  get [KubernetesHelmGenerator.WRITING]() {
    return {
      async writingRustHelmTemplates() {
        const baseName = this.jhipsterConfig.baseName || 'app';
        const dockerRegistryUrl = this._rustHelmContext.dockerRegistryUrl || '';
        const registryPrefix = dockerRegistryUrl ? `${dockerRegistryUrl}/` : '';
        const chartDir = `helm/${baseName.toLowerCase()}`;

        const context = {
          baseName,
          dockerImageName: `${registryPrefix}${baseName.toLowerCase()}`,
          ...this._rustHelmContext,
        };

        // Chart root files (Chart.yaml, values.yaml, .helmignore)
        for (const file of helmChartFiles) {
          const destFile = file === 'helmignore' ? '.helmignore' : file;
          this.renderTemplate(`helm/${file}.ejs`, `${chartDir}/${destFile}`, context);
        }

        // Core Helm templates (deployment, service, etc.)
        for (const file of helmTemplateFiles) {
          this.renderTemplate(`helm/${file}.ejs`, `${chartDir}/${file}`, context);
        }

        // Conditional templates (database, infrastructure, ingress, etc.)
        for (const [, entry] of Object.entries(helmConditionalTemplateFiles)) {
          if (entry.condition(context)) {
            this.renderTemplate(`helm/${entry.file}.ejs`, `${chartDir}/${entry.file}`, context);
          }
        }

        // Script files (helm-apply.sh, README)
        for (const file of helmScriptFiles) {
          this.renderTemplate(`helm/${file}.ejs`, `helm/${file}`, context);
        }
      },
    };
  }

  get [KubernetesHelmGenerator.END]() {
    return {
      async logRustHelmSuccess() {
        const baseName = (this.jhipsterConfig.baseName || 'app').toLowerCase();
        this.log.verboseInfo('\nHelm chart generated successfully!');
        this.log.log('\nInstall with:');
        this.log.verboseInfo(`  helm install ${baseName} ./helm/${baseName}`);
        this.log.log('\nUpgrade with:');
        this.log.verboseInfo(`  helm upgrade ${baseName} ./helm/${baseName}`);
        this.log.log('\nUninstall with:');
        this.log.verboseInfo(`  helm uninstall ${baseName}`);
        this.log.log('\nOr use the helper script:');
        this.log.verboseInfo('  ./helm/helm-apply.sh install');
      },
      async makeScriptsExecutable() {
        const scriptPath = this.destinationPath('helm/helm-apply.sh');
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
