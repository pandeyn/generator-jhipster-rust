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
        // Disable cypress audit to avoid Chrome installation requirement in Docker
        // This is especially important for Rust backends which may use Alpine-based images
        application.cypressAudit = false;
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      customizeResetPasswordTests({ application }) {
        // Skip reset-password test only when email is disabled
        if (application.generateUserManagement && !application.enableEmail) {
          this.editFile(`${application.cypressDir}/e2e/account/reset-password-page.cy.ts`, content =>
            content.replace(
              "it('should be able to init reset password",
              "it.skip('should be able to init reset password - email service is disabled",
            ),
          );
        }
      },

      customizeAuthTests({ application }) {
        // Skip OAuth2-specific login tests that require Keycloak integration
        if (application.authenticationTypeOauth2) {
          this.editFile(`${application.cypressDir}/e2e/account/login-page.cy.ts`, { ignoreNonExisting: true }, content =>
            content.replace("describe('login page'", "describe.skip('login page - OAuth2 requires Keycloak setup'"),
          );
        }
      },

      customizeMongoDbTests({ application }) {
        // MongoDB uses ObjectId instead of numeric IDs
        if (application.databaseTypeMongodb || application.devDatabaseTypeMongodb) {
          // Entity tests may need ObjectId format adjustments
          // The base templates should handle this, but we can add customizations if needed
          this.editFile(`${application.cypressDir}/support/entity.ts`, { ignoreNonExisting: true }, content => {
            // Update any hardcoded numeric IDs to ObjectId format if present
            return content;
          });
        }
      },

      npmScripts({ application }) {
        // Modify client package.json with Rust-specific scripts
        const clientPackageJson = this.createStorage(this.destinationPath(application.clientRootDir, 'package.json'));

        clientPackageJson.merge({
          scripts: {
            // Pre-hook for headless E2E tests (empty to prevent npm errors)
            'pree2e:headless': '',
            // Custom script to wait for Rust backend before running tests
            'e2e:wait-backend': 'wait-on http://localhost:8080/api/health -t 120000',
          },
        });
      },
    });
  }
}
