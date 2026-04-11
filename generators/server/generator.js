import ServerGenerator from 'generator-jhipster/generators/server';

import { fixBlueprintPackagePath } from '../generator-rust-constants.js';

export default class extends ServerGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, queueCommandTasks: true, sbsBlueprint: true, checkBlueprint: true });
    fixBlueprintPackagePath(this);
  }

  get [ServerGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {
        await this.composeWithJHipster('jhipster-rust:rust-server');
      },
    });
  }
}
