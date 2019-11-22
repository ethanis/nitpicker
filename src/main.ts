import * as core from '@actions/core';
import { getConfiguredComments } from './services';

async function run() {
  try {
    const nitpickerFile = core.getInput('nitpickerFile');
    console.log(`Nitpicker file: ${nitpickerFile}`);

    const comments = getConfiguredComments(nitpickerFile);

    if ((comments?.length ?? 0) == 0) {
      console.log('No comments are configured');

      return;
    }

    console.log(`There are ${comments.length} comments configured`);

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
