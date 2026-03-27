import { asCommand } from 'generator-jhipster';
import { command as jhipsterCommand } from 'generator-jhipster/generators/kubernetes-helm';

export default asCommand({
  options: {
    ...jhipsterCommand.options,
  },
  configs: {
    ...jhipsterCommand.configs,
  },
});
