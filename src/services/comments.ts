import * as github from '@actions/github';
import * as core from '@actions/core';
import {
  Comment,
  PullRequestComment,
  Conclusion,
  ChangeType,
  Change
} from '../models';
import { Minimatch, IOptions } from 'minimatch';
import { parseContext } from './context';

export async function getTargetState(
  octokit: github.GitHub,
  allComments: Comment[],
  changes: Change[]
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
    changes
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

  if (!context.pullRequest) {
    core.debug('we will only nitpick pull requests');

    // Write matched comments out to build log
    for (const comment of comments) {
      console.log('Matched comment: ');
      console.log(comment.markdown);
      console.log();
    }

    return;
  }

  // Write matched comments to pull request
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
  changes: Change[]
): Comment[] {
  const applicableComments: Comment[] = [];
  const options: IOptions = { dot: true, nocase: true };

  for (const comment of allComments) {
    const inclusions: string[] = [];
    const exclusions: string[] = [];

    for (const pathFilter of comment.pathFilter) {
      if (pathFilter.startsWith('!')) {
        exclusions.push(pathFilter.substring(1));
      } else {
        inclusions.push(pathFilter);
      }
    }

    for (const change of changes) {
      let isMatch = false;

      // Match inclusions first
      for (const inclusion of inclusions) {
        core.debug(` checking pattern ${inclusion}`);

        let changeType: ChangeType;
        let pattern = inclusion;

        switch (inclusion[0]) {
          case '+':
            changeType = ChangeType.add;
            pattern = inclusion.substring(1);
            break;
          case '-':
            changeType = ChangeType.delete;
            pattern = inclusion.substring(1);
            break;
          case '~':
            changeType = ChangeType.edit;
            pattern = inclusion.substring(1);
            break;
          default:
            changeType = ChangeType.any;
            break;
        }

        const matcher = new Minimatch(pattern, options);
        core.debug(` - ${change.file}`);

        const matched = pattern === '*' ? true : matcher.match(change.file);

        if (matched) {
          switch (changeType) {
            case ChangeType.add:
              isMatch = change.changeType == ChangeType.add;
              break;
            case ChangeType.delete:
              isMatch = change.changeType == ChangeType.delete;
              break;
            case ChangeType.edit:
              isMatch =
                change.changeType !== ChangeType.add &&
                change.changeType !== ChangeType.delete;
              break;
            case ChangeType.any:
              isMatch = true;
              break;
          }
        }
      }

      // If no inclusions match this file path, continue on to the next change
      if (!isMatch) {
        continue;
      }

      // Check if any exclusion should filter out the match
      for (const exclusion in exclusions) {
        // First exclusion to match will negate the inclusion match
        const matcher = new Minimatch(exclusion, options);
        const match = matcher.match(change.file);

        // If not a match, no need to negate the inclusive pattern
        if (!match) {
          continue;
        }

        // If this was a match, we need to negate the inclusive pattern
        isMatch = false;
        break;
      }

      // If we've made it this far, comment is good to go
      if (isMatch) {
        applicableComments.push(comment);
      }
    }
  }

  return applicableComments;
}

async function getExistingComments(
  octokit: github.GitHub
): Promise<PullRequestComment[]> {
  const context = parseContext();

  if (!context.pullRequest) {
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
