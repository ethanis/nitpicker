import * as core from '@actions/core';
import * as fs from 'fs';
import * as github from '@actions/github';
import { getChangedFiles } from './services/changes';
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

    const token = core.getInput('token');
    const octokit = new github.GitHub(token);
    const eventName = process.env.GITHUB_EVENT_NAME;

    const changedFiles: string[] = await getChangedFiles(octokit, eventName);

    console.log(`Found ${changedFiles.length} files`);

    core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
