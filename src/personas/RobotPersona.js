// @flow
import stripIndent from 'strip-indent';
import { type Persona } from '../types';

function trim(str) {
  return stripIndent(str).trim();
}

const GoatPersona: Persona = {
  helpContent: trim(`
    ...
  `),

  addedToQueue: trim(`
    ...
  `),

  removedFromQueue: trim(`
    ...
  `),

  notRemovedFromQueue: trim(`
    ...
  `),

  unknownCommand: trim(`
    ...
  `),

  error: trim(`
    ...
  `),
};

export default GoatPersona;
