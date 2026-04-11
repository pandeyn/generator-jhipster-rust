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

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            files: [{ templates: ['template-file-common'] }],
          },
          context: application,
        });
      },
    });
  }
}
