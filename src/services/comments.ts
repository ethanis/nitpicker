import * as github from '@actions/github';
import * as core from '@actions/core';
import { Comment } from '../models';
import { Minimatch } from 'minimatch';

export function getCommentsToAdd(
  allComments: Comment[],
  changedFiles: string[]
): Comment[] {
  const commentsToAdd: Comment[] = [];

  for (const comment of allComments) {
    let matchedComment = false;

    for (const pathFilter of comment.pathFilter) {
      core.debug(` checking pattern ${pathFilter}`);

      const matcher = new Minimatch(pathFilter);

      for (const changedFile of changedFiles) {
        core.debug(` - ${changedFile}`);
        if (matcher.match(changedFile)) {
          commentsToAdd.push(comment);
          matchedComment = true;
          core.debug(` ${changedFile} matches`);

          break;
        }
      }

      if (matchedComment) {
        break;
      }
    }
  }

  return commentsToAdd;
}

export async function writeComments(
  octokit: github.GitHub,
  comments: Comment[]
): Promise<void> {
  console.log(`writing ${comments.length} comments`);

  const pullRequest = github.context.payload.pull_request;
  const owner = github.context.payload.repository?.owner?.name;
  const repo = github.context.payload.repository?.name;

  console.log('PR', pullRequest);
  console.log('owner (full)', github.context.payload.repository?.owner);
  console.log('owner (name)', owner);
  console.log('repo', repo);

  if (!pullRequest || !owner || !repo) {
    console.log('we will only nitpick pull requests');

    return;
  }

  for (const comment of comments) {
    await octokit.issues.createComment({
      repo: repo,
      owner: owner,
      issue_number: pullRequest.number,
      body: comment.markdown
    });
  }
}
