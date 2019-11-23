import * as github from '@actions/github';
import * as core from '@actions/core';
import { Comment } from '../models';
import { Minimatch, IOptions } from 'minimatch';

export function getCommentsToAdd(
  allComments: Comment[],
  changedFiles: string[]
): Comment[] {
  const commentsToAdd: Comment[] = [];

  const options: IOptions = { dot: true, nocase: true };
  for (const comment of allComments) {
    let matchedComment = false;

    for (const pathFilter of comment.pathFilter) {
      core.debug(` checking pattern ${pathFilter}`);

      const matcher = new Minimatch(pathFilter, options);

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
  const fullName = github.context.payload.repository?.full_name;
  const parts = fullName?.split('/') ?? [];
  const owner = parts[0];
  const repo = parts[1];

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
