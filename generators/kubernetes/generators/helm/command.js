import { asCommand } from 'generator-jhipster';
import { command as jhipsterCommand } from 'generator-jhipster/generators/kubernetes/generators/helm';

export default asCommand({
  options: {
    ...jhipsterCommand.options,
  },
  configs: {
    ...jhipsterCommand.configs,
  },
});
