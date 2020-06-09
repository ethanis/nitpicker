import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  getConfiguredComments,
  getChangedFiles,
  writeComments,
  getTargetState,
  startCheck,
  completeCheck,
  updateComments,
  resolveComments
} from './services';
import { Change } from './models';

async function run() {
  try {
    console.log('github actions + nitpicker = heart');
    const nitpicks = core.getInput('nitpicks');
    console.log(`Nitpicks file: ${nitpicks}`);

    const comments = getConfiguredComments(nitpicks);

    if ((comments?.length ?? 0) == 0) {
      console.log('No comments are configured');

      return;
    }

    console.log(`There are ${comments.length} comments configured`);

    const token = core.getInput('token');

    if (!token) {
      core.setFailed(
        "You must allow the nitpicker action to access the GitHub secret (e.g. `token: '${{ secrets.GITHUB_TOKEN }}'`)"
      );

      return;
    }

    const octokit = new github.GitHub(token, {
      previews: ['squirrel-girl']
    });

    const eventName = process.env.GITHUB_EVENT_NAME;

    console.log('starting check');

    const checkRun = await startCheck(octokit);

    const changes: Change[] = await getChangedFiles(octokit, eventName);
    const targetState = await getTargetState(octokit, comments, changes);

    await Promise.all([
      writeComments(octokit, targetState.commentsToAdd),
      updateComments(octokit, targetState.commentsToUpdate),
      resolveComments(octokit, targetState.commentsToResolve)
    ]);

    await completeCheck(octokit, checkRun.id, targetState.conclusion);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
