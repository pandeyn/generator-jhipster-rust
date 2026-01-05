import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { SERVER_RUST_SRC_DIR } from '../generator-rust-constants.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      sbsBlueprint: true,
    });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      async configuring() {
        // Set backendType to Rust to indicate this is not a Java/Spring Boot backend
        this.jhipsterConfig.withAdminUi = false;
        this.jhipsterConfig.backendType = 'Rust';
      },
    });
  }

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      async loadingTemplateTask({ application }) {
        application.clientRootDir = 'client/';
        application.clientSrcDir = 'client/src/';
        application.clientTestDir = 'client/test/';
        application.dockerServicesDir = 'docker/';
        application.withAdminUi = false;
        application.rustServerRootDir = `${SERVER_RUST_SRC_DIR}/`;
        application.dbPortValue = undefined;
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async preparingTemplateTask({ application }) {
        application.clientDistDir = 'server/dist/static/';
        application.temporaryDir = 'tmp/';
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY]() {
    return this.asPreparingEachEntityTaskGroup({
      async preparingEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_RELATIONSHIP]() {
    return this.asPreparingEachEntityRelationshipTaskGroup({
      async preparingEachEntityRelationshipTemplateTask() {},
    });
  }
}
