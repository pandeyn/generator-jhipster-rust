import chalk from 'chalk';
import { asCommand } from 'generator-jhipster';

export default asCommand({
  configs: {
    authenticationType: {
      cli: {
        type: String,
      },
      prompt: {
        type: 'list',
        message: `Which ${chalk.yellow('*authentication type*')} would you like to use?`,
      },
      choices: [
        { value: 'jwt', name: 'JWT authentication (stateless, with a token)' },
        { value: 'oauth2', name: 'OAuth 2.0 / OIDC Authentication (Keycloak, Okta)' },
      ],
      default: 'jwt',
    },
    serviceDiscoveryType: {
      cli: {
        type: String,
        description: 'Service discovery type for microservices architecture',
      },
      prompt: generator => ({
        type: 'list',
        message: `Which ${chalk.yellow('*service discovery*')} would you like to use?`,
        when: ['gateway', 'microservice'].includes(generator.jhipsterConfigWithDefaults.applicationType),
      }),
      choices: [
        { value: 'consul', name: 'Consul (recommended for service discovery and configuration)' },
        { value: 'no', name: 'No service discovery' },
      ],
      default: 'consul',
    },
    externalConfig: {
      cli: {
        type: Boolean,
        description: 'Enable external configuration via Consul KV store',
      },
      prompt: generator => ({
        type: 'confirm',
        message: `Would you like to enable ${chalk.yellow('*external configuration*')} via Consul KV store?`,
        when:
          ['gateway', 'microservice'].includes(generator.jhipsterConfigWithDefaults.applicationType) &&
          generator.jhipsterConfigWithDefaults.serviceDiscoveryType === 'consul',
        default: true,
      }),
      default: true,
    },
    devDatabaseType: {
      cli: {
        type: String,
      },
      prompt: {
        type: 'list',
        message: `Which ${chalk.yellow('*database*')} would you like to use?`,
      },
      choices: [
        { value: 'sqlite', name: 'SQLite (lightweight, file-based, great for development)' },
        { value: 'postgresql', name: 'PostgreSQL (production-ready, full-featured relational database)' },
        { value: 'mysql', name: 'MySQL (popular open-source relational database)' },
        { value: 'mongodb', name: 'MongoDB (NoSQL document database with flexible schema)' },
      ],
      default: 'sqlite',
    },
    enableSwaggerCodegen: {
      cli: {
        type: Boolean,
      },
      prompt: {
        type: 'confirm',
        message: `Would you like to enable ${chalk.yellow('*Swagger/OpenAPI*')} documentation with Swagger UI and Scalar?`,
        default: true,
      },
      default: true,
    },
    enableEmail: {
      cli: {
        type: Boolean,
      },
      prompt: generator => ({
        type: 'confirm',
        message: `Would you like to enable ${chalk.yellow('*email*')} support for user registration and password reset?`,
        when: generator.jhipsterConfigWithDefaults.authenticationType === 'jwt',
        default: false,
      }),
      default: false,
    },
    messageBroker: {
      cli: {
        type: String,
        description: 'Message broker for asynchronous messaging',
      },
      prompt: {
        type: 'list',
        message: `Would you like to use a ${chalk.yellow('*message broker*')} for asynchronous messaging?`,
      },
      choices: [
        { value: 'no', name: 'No message broker' },
        { value: 'kafka', name: 'Apache Kafka (high-throughput distributed messaging)' },
      ],
      default: 'no',
    },
    monitoring: {
      cli: {
        type: String,
        description: 'Monitoring solution for metrics collection',
      },
      prompt: {
        type: 'list',
        message: `Would you like to enable ${chalk.yellow('*monitoring*')} for your application?`,
      },
      choices: [
        { value: 'no', name: 'No monitoring' },
        { value: 'prometheus', name: 'Prometheus (metrics collection with Grafana dashboards)' },
      ],
      default: 'no',
    },
    distributedTracing: {
      cli: {
        type: String,
        description: 'Distributed tracing solution for microservices',
      },
      prompt: generator => ({
        type: 'list',
        message: `Would you like to enable ${chalk.yellow('*distributed tracing*')} for your application?`,
        when: ['gateway', 'microservice'].includes(generator.jhipsterConfigWithDefaults.applicationType),
      }),
      choices: [
        { value: 'no', name: 'No distributed tracing' },
        { value: 'zipkin', name: 'Zipkin (lightweight distributed tracing)' },
        { value: 'jaeger', name: 'Jaeger (full-featured distributed tracing with Jaeger UI)' },
      ],
      default: 'no',
    },
    secretsManagement: {
      cli: {
        type: String,
        description: 'Secrets management solution for secure credentials storage',
      },
      prompt: generator => ({
        type: 'list',
        message: `Would you like to use a ${chalk.yellow('*secrets management*')} solution?`,
        when:
          ['gateway', 'microservice'].includes(generator.jhipsterConfigWithDefaults.applicationType) &&
          generator.jhipsterConfigWithDefaults.serviceDiscoveryType === 'consul' &&
          generator.jhipsterConfigWithDefaults.externalConfig !== false,
      }),
      choices: [
        { value: 'no', name: 'No secrets management (use environment variables)' },
        { value: 'vault', name: 'HashiCorp Vault (secure secrets storage with Consul backend)' },
      ],
      default: 'no',
    },
    circuitBreaker: {
      cli: {
        type: Boolean,
        description: 'Enable circuit breaker pattern for resilient HTTP calls',
      },
      prompt: generator => ({
        type: 'confirm',
        message: `Would you like to enable the ${chalk.yellow('*circuit breaker*')} pattern for resilient HTTP calls?`,
        when: ['gateway', 'microservice'].includes(generator.jhipsterConfigWithDefaults.applicationType),
        default: true,
      }),
      default: true,
    },
  },
});
