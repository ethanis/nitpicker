import * as core from '@actions/core';
import { promises as fs } from 'fs';

async function run() {
  try {
    const nitpickerFile = core.getInput('nitpickerFile');
    console.log(`Nitpicker file: ${nitpickerFile}`);

    const contents = await fs.readFile(nitpickerFile);

    console.log('Nitpicker file contents:');
    console.log(contents);

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
