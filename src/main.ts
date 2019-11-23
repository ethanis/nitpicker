import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  getConfiguredComments,
  getChangedFiles,
  getCommentsToAdd,
  writeComments
} from './services';
import { Comment } from './models';

async function run() {
  try {
    const nitpicksFile = core.getInput('nitpicksFile');
    console.log(`Nitpicks file: ${nitpicksFile}`);

    const comments = getConfiguredComments(nitpicksFile);

    if ((comments?.length ?? 0) == 0) {
      console.log('No comments are configured');

      return;
    }

    console.log(`There are ${comments.length} comments configured`);

    const token = core.getInput('token');
    const octokit = new github.GitHub(token);
    const eventName = process.env.GITHUB_EVENT_NAME;
    console.log(eventName);

    const changedFiles: string[] = await getChangedFiles(octokit, eventName);
    const commentsToAdd: Comment[] = getCommentsToAdd(comments, changedFiles);

    await writeComments(octokit, commentsToAdd);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
