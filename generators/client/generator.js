import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      sbsBlueprint: true,
    });
  }

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async addPopperDependency({ application }) {
        // @popperjs/core is a peer dependency of @ng-bootstrap/ng-bootstrap and bootstrap.
        // It must be explicitly listed so that npm install --legacy-peer-deps (used in
        // the Dockerfile) resolves it correctly.
        if (application.clientFrameworkAngular) {
          const clientPackageJson = this.createStorage(this.destinationPath(application.clientRootDir, 'package.json'));
          clientPackageJson.merge({
            dependencies: {
              '@popperjs/core': '2.11.8',
            },
          });
        }
      },
    });
  }
}
