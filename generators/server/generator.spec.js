import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'server';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

describe('SubGenerator server of rust JHipster blueprint', () => {
  describe('run', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig({
          baseName: 'testApp',
          applicationType: 'monolith',
          skipClient: true,
        })
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: ['rust'],
        })
        .withJHipsterLookup()
        .withParentBlueprintLookup();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });

    it('should generate Rust server files', () => {
      result.assertFile(['Cargo.toml', 'server/Cargo.toml', 'server/src/main.rs']);
    });
  });
});
