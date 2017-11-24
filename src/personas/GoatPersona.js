// @flow
import stripIndent from 'strip-indent';
import { type Persona } from '../types';

function trim(str) {
  return stripIndent(str).trim();
}

const GoatPersona: Persona = {
  helpContent: trim(`
    Manure gonna love this.

    I'm here to help you merge and publish your changes. Once your pull request is ready, you can mention me with "land" and I will do the following:

      - Add your pull request to my queue
      - Work my way through all of the pull requests before yours
      - Create a new branch with your pull request on top of the latest master
      - Run our Continuous Integration server on the branch
      - If it succeeds, I'll merge it into master and publish everything
      - If it fails, I'll comment back here and let you know
      - Once you fix the issue, just start this whole process over again.

    This process ensures that master always stays green and keeps people from stepping on top of eachother.

    Goat, out.
  `),

  addedToQueue: trim(`
    Okay... I've added this pull request to the queue to merge after it successfully builds.
  `),

  removedFromQueue: trim(`
    No worries, I removed this pull request from my queue. Let me know when you're ready to land it again.
  `),

  notRemovedFromQueue: trim(`
    I didn't have this pull request in my queue. Was I supposed to?
  `),

  unknownCommand: trim(`
    You've confused me, I'm going to hit the hay. (Do you need "help"?)
  `),

  error: trim(`
    Oh no, I've failed you:
  `),
};

export default GoatPersona;
