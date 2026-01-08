import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      sbsBlueprint: true,
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async preparingTemplateTask({ application }) {
        // Register 'app' docker service so the main docker generator knows about it
        application.dockerServices.push('app');

        // Set database type flags for docker templates
        const devDbType = this.jhipsterConfig.devDatabaseType || 'sqlite';
        application.devDatabaseType = devDbType;
        application.devDatabaseTypeSqlite = devDbType === 'sqlite';
        application.devDatabaseTypePostgresql = devDbType === 'postgresql';
        application.devDatabaseTypeMysql = devDbType === 'mysql';
        application.devDatabaseTypeMongodb = devDbType === 'mongodb';
      },
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            docker: [
              {
                path: 'docker/',
                templates: ['app.yml'],
              },
              {
                condition: ctx => ctx.authenticationTypeOauth2,
                path: 'docker/',
                templates: ['keycloak.yml'],
              },
              {
                condition: ctx => ctx.authenticationTypeOauth2,
                path: 'docker/',
                templates: ['realm-config/jhipster-realm.json'],
              },
              // MongoDB-specific docker files
              {
                condition: ctx => ctx.devDatabaseTypeMongodb,
                path: 'docker/',
                templates: ['mongodb.yml'],
              },
              // MySQL-specific docker files
              {
                condition: ctx => ctx.devDatabaseTypeMysql,
                path: 'docker/',
                templates: ['mysql.yml'],
              },
            ],
            files: [{ templates: ['template-file-docker'] }],
          },
          context: application,
        });
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async overrideServicesYml({ application }) {
        // Override services.yml after base JHipster has written it
        // This ensures our database-specific configuration takes precedence
        await this.writeFiles({
          sections: {
            docker: [
              {
                path: 'docker/',
                templates: ['services.yml'],
              },
            ],
          },
          context: application,
        });

        // Clean up database-specific files that don't apply to this project
        if (application.devDatabaseTypeMongodb) {
          // Remove SQL database files for MongoDB projects
          this.deleteDestination('docker/postgresql.yml');
          this.deleteDestination('docker/mysql.yml');
        } else if (application.devDatabaseTypePostgresql) {
          // Remove other database files for PostgreSQL projects
          this.deleteDestination('docker/mongodb.yml');
          this.deleteDestination('docker/mysql.yml');
        } else if (application.devDatabaseTypeMysql) {
          // Remove other database files for MySQL projects
          this.deleteDestination('docker/mongodb.yml');
          this.deleteDestination('docker/postgresql.yml');
        }
      },
    });
  }
}
