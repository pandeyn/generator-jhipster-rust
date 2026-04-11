import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';

import { fixBlueprintPackagePath } from '../generator-rust-constants.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, {
      ...features,
      queueCommandTasks: true,
      sbsBlueprint: true,
    });
    fixBlueprintPackagePath(this);
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {},
    });
  }
}
