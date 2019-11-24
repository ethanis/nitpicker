import * as core from '@actions/core';
import * as github from '@actions/github';
import {
  getConfiguredComments,
  getChangedFiles,
  writeComments,
  getTargetState,
  resolveComments,
  reactivateComments,
  startCheck,
  completeCheck
} from './services';
import { Comment, PullRequestComment } from './models';

async function run() {
  try {
    console.log('gh actions + nitpicker = heart');
    const nitpicks = core.getInput('nitpicks');
    console.log(`Nitpicks file: ${nitpicks}`);

    const comments = getConfiguredComments(nitpicks);

    if ((comments?.length ?? 0) == 0) {
      console.log('No comments are configured');

      return;
    }

    console.log(`There are ${comments.length} comments configured`);

    const token = core.getInput('token');
    const octokit = new github.GitHub(token);
    const eventName = process.env.GITHUB_EVENT_NAME;
    console.log(eventName);

    const checkRun = await startCheck(octokit);

    const changedFiles: string[] = await getChangedFiles(octokit, eventName);
    const targetState = await getTargetState(octokit, comments, changedFiles);

    await Promise.all([
      writeComments(octokit, targetState.commentsToAdd),
      resolveComments(octokit, targetState.commentsToResolve),
      reactivateComments(octokit, targetState.commentsToReactivate)
    ]);

    await completeCheck(octokit, checkRun.id, targetState.conclusion);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
