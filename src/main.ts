import * as core from '@actions/core';
import { getConfiguredComments } from './services';

async function run() {
  try {
    const nitpickerFile = core.getInput('nitpickerFile');
    console.log(`Nitpicker file: ${nitpickerFile}`);

    const comments = getConfiguredComments(nitpickerFile);

    console.log(`There are ${comments.length} comments configured`);

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    console.log(error);

    core.setFailed(error.message);
  }
}

run();
