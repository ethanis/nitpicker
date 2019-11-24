import * as github from '@actions/github';
import * as core from '@actions/core';
import { Comment, PullRequestComment, Conclusion } from '../models';
import { Minimatch, IOptions } from 'minimatch';
import { parseContext } from './context';

export async function getTargetState(
  octokit: github.GitHub,
  allComments: Comment[],
  changedFiles: string[]
): Promise<{
  commentsToAdd: Comment[];
  commentsToReactivate: PullRequestComment[];
  commentsToResolve: PullRequestComment[];
  conclusion: Conclusion;
}> {
  const commentsToAdd: Comment[] = [];
  const commentsToReactivate: PullRequestComment[] = [];
  const commentsToResolve: PullRequestComment[] = [];

  let conclusion: Conclusion = 'success';

  const existingComments: PullRequestComment[] = await getExistingComments(
    octokit
  );

  const applicableComments: Comment[] = getApplicableComments(
    allComments,
    changedFiles
  );

  for (const comment of allComments) {
    const isApplicable =
      applicableComments.filter(
        c =>
          c.markdown === comment.markdown && c.pathFilter === comment.pathFilter
      )?.length > 0;
    const existing = existingComments.filter(c => c.body === comment.markdown);

    if (comment.blocking && isApplicable) {
      conclusion = 'failure';
    }

    // If there's no existing comments on the pull request, add to new target if applicable
    if (existing.length === 0 && isApplicable) {
      commentsToAdd.push(comment);
    }

    if (existing.length === 0) {
      continue;
    }

    // If comment exists, update comment
    for (const previousComment of existing) {
      var isActive = true; //  previousComment.Reactions.Confused > 0;

      if (!isApplicable && isActive) {
        // Still active but not applicable
        commentsToResolve.push(previousComment);
      } else if (isApplicable && !isActive && comment.blocking) {
        // Not active, but applicable AND blocking
        commentsToReactivate.push(previousComment);
      }
    }
  }

  return {
    commentsToAdd: commentsToAdd,
    commentsToReactivate: commentsToReactivate,
    commentsToResolve: commentsToResolve,
    conclusion: conclusion
  };
}

export async function writeComments(
  octokit: github.GitHub,
  comments: Comment[]
): Promise<void> {
  core.debug(`writing ${comments.length} comments`);

  const context = parseContext();

  if (!context.pullRequest || !context.owner || !context.repo) {
    core.debug('we will only nitpick pull requests');

    return;
  }

  for (const comment of comments) {
    await octokit.issues.createComment({
      repo: context.repo,
      owner: context.owner,
      issue_number: context.pullRequest.number,
      body: comment.markdown
    });
  }
}

export async function resolveComments(
  octokit: github.GitHub,
  comments: PullRequestComment[]
): Promise<void> {
  // const octokit = new Octokit({
  //   previews: ["mercy-preview"]
  // });
  // const {
  //   data: { topics }
  // } = await octokit.repos.get({
  //   owner: "octokit",
  //   repo: "rest.js",
  //   mediaType: {
  //     previews: ["symmetra"]
  //   }
  // });
}

export async function reactivateComments(
  octokit: github.GitHub,
  comments: PullRequestComment[]
): Promise<void> {}

function getApplicableComments(
  allComments: Comment[],
  changedFiles: string[]
): Comment[] {
  const applicableComments: Comment[] = [];
  const options: IOptions = { dot: true, nocase: true };

  for (const comment of allComments) {
    let matchedComment = false;

    for (const pathFilter of comment.pathFilter) {
      core.debug(` checking pattern ${pathFilter}`);

      if (pathFilter === '*') {
        applicableComments.push(comment);
        matchedComment = true;
        break;
      }

      const matcher = new Minimatch(pathFilter, options);

      for (const changedFile of changedFiles) {
        core.debug(` - ${changedFile}`);
        if (matcher.match(changedFile)) {
          applicableComments.push(comment);
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

  return applicableComments;
}

async function getExistingComments(
  octokit: github.GitHub
): Promise<PullRequestComment[]> {
  const context = parseContext();

  if (!context.pullRequest || !context.owner || !context.repo) {
    core.debug('we will only nitpick pull requests');

    return [];
  }

  const comments = await octokit.issues.listComments({
    repo: context.repo,
    owner: context.owner,
    issue_number: context.pullRequest.number
  });

  return comments.data.map(c => ({
    body: c.body,
    author: c.user.login,
    id: c.id
  }));
}
