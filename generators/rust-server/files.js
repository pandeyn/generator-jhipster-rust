import { SERVER_RUST_SRC_DIR } from '../generator-rust-constants.js';

const SERVER_RUST_DIR = `${SERVER_RUST_SRC_DIR}/`;

export const serverFiles = {
  cargo: [
    {
      templates: [
        'Cargo.toml',
        {
          file: 'env',
          renameTo: () => '.env',
        },
        '.gitignore.jhi.rust',
        'Dockerfile',
        'README.md.jhi.rust',
      ],
    },
    {
      // Diesel config only for SQL databases
      condition: generator => !generator.devDatabaseTypeMongodb,
      templates: ['diesel.toml'],
    },
  ],
  docker: [
    {
      condition: generator => generator.devDatabaseTypePostgresql || generator.devDatabaseTypeMongodb,
      templates: ['docker-compose.yml'],
    },
  ],
  server: [
    {
      path: SERVER_RUST_DIR,
      templates: [
        'Cargo.toml',
        'src/main.rs',
        'src/lib.rs',
        'src/config/mod.rs',
        'src/config/app_config.rs',
        'src/config/database.rs',
        'src/db/mod.rs',
        'src/models/mod.rs',
        'src/handlers/mod.rs',
        'src/handlers/health.rs',
        'src/handlers/management.rs',
        'src/handlers/user.rs',
        'src/handlers/account.rs',
        'src/services/mod.rs',
        'src/services/auth_service.rs',
        'src/middleware/mod.rs',
        'src/middleware/auth.rs',
        'src/errors/mod.rs',
        'src/errors/app_error.rs',
        'src/dto/mod.rs',
        'src/dto/user_dto.rs',
        'src/dto/pagination.rs',
        'src/dto/common.rs',
        'src/test_utils.rs',
      ],
    },
    {
      // OpenAPI/Swagger files (only when enabled)
      condition: generator => generator.enableSwaggerCodegen,
      path: SERVER_RUST_DIR,
      templates: ['src/openapi.rs'],
    },
    {
      // SQL-specific files (Diesel ORM)
      condition: generator => !generator.devDatabaseTypeMongodb,
      path: SERVER_RUST_DIR,
      templates: [
        'src/db/connection.rs',
        'src/db/schema.rs',
        'src/models/user.rs',
        'src/models/authority.rs',
        'src/services/user_service.rs',
      ],
    },
    {
      // MongoDB-specific files
      condition: generator => generator.devDatabaseTypeMongodb,
      path: SERVER_RUST_DIR,
      templates: [
        'src/db/mongodb_connection.rs',
        'src/models/user_mongodb.rs',
        'src/models/authority_mongodb.rs',
        'src/services/user_service_mongodb.rs',
      ],
    },
    {
      condition: generator => generator.authenticationTypeOauth2,
      path: SERVER_RUST_DIR,
      templates: [
        'src/config/oauth2_config.rs',
        'src/security/mod.rs',
        'src/security/jwks.rs',
        'src/security/oauth2_validator.rs',
        'src/handlers/oauth2.rs',
      ],
    },
    {
      // Static files handler for monolithic deployment
      condition: generator => generator.applicationTypeMonolith,
      path: SERVER_RUST_DIR,
      templates: ['src/handlers/static_files.rs'],
    },
    {
      // Email service files (JWT auth only)
      condition: generator => generator.enableEmail,
      path: SERVER_RUST_DIR,
      templates: [
        'src/config/email_config.rs',
        'src/services/email_service.rs',
        { file: 'src/templates/email/activation.html', renameTo: () => 'src/templates/email/activation.html' },
        { file: 'src/templates/email/password-reset.html', renameTo: () => 'src/templates/email/password-reset.html' },
        { file: 'src/templates/email/password-changed.html', renameTo: () => 'src/templates/email/password-changed.html' },
        { file: 'src/templates/email/account-created.html', renameTo: () => 'src/templates/email/account-created.html' },
      ],
    },
  ],
  migrations: [
    {
      // SQL migrations only for non-MongoDB databases
      condition: generator => !generator.devDatabaseTypeMongodb,
      templates: [
        'migrations/00000000000000_diesel_initial_setup/up.sql',
        'migrations/00000000000000_diesel_initial_setup/down.sql',
        'migrations/00000000000001_create_users_authorities/up.sql',
        'migrations/00000000000001_create_users_authorities/down.sql',
      ],
    },
  ],
  scripts: [
    {
      // MongoDB initialization scripts
      condition: generator => generator.devDatabaseTypeMongodb,
      templates: ['scripts/mongodb_init.js'],
    },
  ],
  docs: [
    {
      // Common documentation files for all projects
      templates: ['docs/DOCKER.md', 'docs/EMAIL_INTEGRATION.md', 'docs/ENTITY_GENERATION.md', 'docs/SECURITY.md', 'docs/TESTING.md'],
    },
    {
      // OpenAPI documentation (when Swagger enabled)
      condition: generator => generator.enableSwaggerCodegen,
      templates: ['docs/OPENAPI.md'],
    },
    {
      // Static hosting documentation (monolithic apps only)
      condition: generator => generator.applicationTypeMonolith,
      templates: ['docs/STATIC_HOSTING.md'],
    },
    {
      // OAuth2/Keycloak documentation
      condition: generator => generator.authenticationTypeOauth2,
      templates: ['docs/KEYCLOAK.md'],
    },
    {
      // SQLite documentation
      condition: generator => generator.devDatabaseTypeSqlite,
      templates: ['docs/SQLITE.md'],
    },
    {
      // PostgreSQL documentation
      condition: generator => generator.devDatabaseTypePostgresql,
      templates: ['docs/POSTGRES.md'],
    },
    {
      // MySQL documentation
      condition: generator => generator.devDatabaseTypeMysql,
      templates: ['docs/MYSQL.md'],
    },
    {
      // MongoDB documentation
      condition: generator => generator.devDatabaseTypeMongodb,
      templates: ['docs/MONGODB.md'],
    },
  ],
};

// Convert camelCase/PascalCase/kebab-case to snake_case
function toSnakeCase(str) {
  return str
    .replace(/-/g, '_') // Convert hyphens to underscores first
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export const entityFiles = {
  server: [
    {
      // SQL database entity files (Diesel ORM)
      condition: generator => !generator.devDatabaseTypeMongodb,
      path: SERVER_RUST_DIR,
      renameTo: (data, filepath) => {
        const snakeCaseName = toSnakeCase(data.entityFileName);
        // Replace _entityFileName_ pattern and ensure proper snake_case with underscores
        const result = filepath
          .replace(/_entityFileName_service/g, `${snakeCaseName}_service`)
          .replace(/_entityFileName_dto/g, `${snakeCaseName}_dto`)
          .replace(/_entityFileName_/g, snakeCaseName);
        return `${SERVER_RUST_DIR}${result}`;
      },
      templates: [
        'src/models/_entityFileName_.rs',
        'src/handlers/_entityFileName_.rs',
        'src/services/_entityFileName_service.rs',
        'src/dto/_entityFileName_dto.rs',
      ],
    },
    {
      // MongoDB entity files
      condition: generator => generator.devDatabaseTypeMongodb,
      path: SERVER_RUST_DIR,
      renameTo: (data, filepath) => {
        const snakeCaseName = toSnakeCase(data.entityFileName);
        // Replace _entityFileName_ pattern and handle MongoDB-specific files
        const result = filepath
          .replace(/_entityFileName_service_mongodb/g, `${snakeCaseName}_service`)
          .replace(/_entityFileName_mongodb/g, snakeCaseName)
          .replace(/_entityFileName_dto/g, `${snakeCaseName}_dto`)
          .replace(/_entityFileName_/g, snakeCaseName);
        return `${SERVER_RUST_DIR}${result}`;
      },
      templates: [
        'src/models/_entityFileName_mongodb.rs',
        'src/handlers/_entityFileName_.rs',
        'src/services/_entityFileName_service_mongodb.rs',
        'src/dto/_entityFileName_dto.rs',
      ],
    },
  ],
};
