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
      },
      default: true,
    },
  },
});
