import * as github from '@actions/github';
import * as core from '@actions/core';
import * as octokit from '@octokit/rest';
import {
  Comment,
  PullRequestComment,
  Conclusion,
  ChangeType,
  Change,
  Closed,
  Active
} from '../models';
import { Minimatch, IOptions } from 'minimatch';
import { parseContext } from './context';

const author: string = 'github-actions[bot]';
const cannedTextSeparator: string = '\n--------------\n_Caused by:_\n';
const resolvedText: string = '\n--------------\n_Resolved_\n';

interface MatchResult<T> {
  comment: T;
  matches: string[];
}

export async function getTargetState(
  octokit: github.GitHub,
  allComments: Comment[],
  changes: Change[]
): Promise<{
  commentsToAdd: MatchResult<Comment>[];
  commentsToReactivate: MatchResult<PullRequestComment>[];
  commentsToResolve: MatchResult<PullRequestComment>[];
  commentsToUpdate: MatchResult<PullRequestComment>[];
  conclusion: Conclusion;
}> {
  const commentsToAdd: MatchResult<Comment>[] = [];
  const commentsToReactivate: MatchResult<PullRequestComment>[] = [];
  const commentsToResolve: MatchResult<PullRequestComment>[] = [];
  const commentsToUpdate: MatchResult<PullRequestComment>[] = [];

  let conclusion: Conclusion = 'success';

  const existingComments: PullRequestComment[] = await getExistingComments(
    octokit
  );

  for (const comment of allComments) {
    const matches = isCommentApplicable(comment, changes);
    const isApplicable = matches.length > 0;

    const commentMatchText = `${comment.markdown}${cannedTextSeparator}`;
    const existing = existingComments.filter(c =>
      c.body.startsWith(commentMatchText)
    );

    if (comment.blocking && isApplicable) {
      conclusion = 'failure';
    }

    // If there's no existing comments on the pull request, add to new target if applicable
    if (existing.length === 0 && isApplicable) {
      commentsToAdd.push({ comment: comment, matches: matches });
    }

    if (existing.length === 0) {
      continue;
    }

    // If comment exists, update comment
    for (const previousComment of existing) {
      const isActive = isActiveComment(previousComment);

      if (!isApplicable && isActive) {
        // Still active but not applicable
        commentsToResolve.push({ comment: previousComment, matches: matches });
      } else if (isApplicable && !isActive && comment.blocking) {
        // Not active, but applicable AND blocking
        commentsToReactivate.push({
          comment: previousComment,
          matches: matches
        });
      } else {
        // Still active and applicable
        commentsToUpdate.push({
          comment: previousComment,
          matches: matches
        });
      }
    }
  }

  return {
    commentsToAdd: commentsToAdd,
    commentsToReactivate: commentsToReactivate,
    commentsToResolve: commentsToResolve,
    commentsToUpdate: commentsToUpdate,
    conclusion: conclusion
  };
}

export async function writeComments(
  octokit: github.GitHub,
  comments: MatchResult<Comment>[]
): Promise<void> {
  core.debug(`writing ${comments.length} comments`);

  const context = parseContext();

  if (!context.pullRequest) {
    core.debug('we will only nitpick pull requests');

    // Write matched comments out to build log
    for (const comment of comments) {
      console.log('Matched comment: ');
      console.log(comment.comment.markdown);
      console.log();
    }

    return;
  }

  // Write matched comments to pull request
  for (const comment of comments) {
    const body = getCommentBody(
      comment.comment.markdown,
      comment.matches,
      context.pullRequest?.number ?? 0,
      context.owner,
      context.repo
    );

    // todo: linkify
    const pullRequestComment = await octokit.issues.createComment({
      repo: context.repo,
      owner: context.owner,
      issue_number: context.pullRequest.number,
      body: body
    });

    for (const reaction of Active) {
      await octokit.reactions.createForIssueComment({
        repo: context.repo,
        owner: context.owner,
        comment_id: pullRequestComment.data.id,
        content: reaction
      });
    }
  }
}

export async function updateComments(
  octokit: github.GitHub,
  comments: MatchResult<PullRequestComment>[]
): Promise<void> {
  core.debug(`updating ${comments.length} comments`);

  const context = parseContext();

  if (!context.pullRequest) {
    core.debug('we will only nitpick pull requests');

    // Write matched comments out to build log
    for (const comment of comments) {
      console.log('Matched comment: ');
      console.log(comment.comment.body);
      console.log();
    }

    return;
  }

  // Write matched comments to pull request
  for (const comment of comments) {
    const body = getCommentBody(
      comment.comment.body,
      comment.matches,
      context.pullRequest?.number ?? 0,
      context.owner,
      context.repo
    );

    // If we don't need to update canned text
    if (body === comment.comment.body) {
      continue;
    }

    await octokit.issues.updateComment({
      repo: context.repo,
      owner: context.owner,
      comment_id: comment.comment.id,
      body: body
    });
  }
}

export async function resolveComments(
  octokit: github.GitHub,
  comments: MatchResult<PullRequestComment>[]
): Promise<void> {
  core.debug(`resolving ${comments.length} comments`);

  const context = parseContext();

  if (!context.pullRequest) {
    core.debug('we will only nitpick pull requests');

    return;
  }

  // Write matched comments to pull request
  for (const comment of comments) {
    const cannedTextIndex = comment.comment.body.lastIndexOf(
      cannedTextSeparator
    );

    const body = `${comment.comment.body.substring(
      0,
      cannedTextIndex
    )}${resolvedText}`;

    await octokit.issues.updateComment({
      repo: context.repo,
      owner: context.owner,
      comment_id: comment.comment.id,
      body: body
    });

    const reactions = await octokit.reactions.listForIssueComment({
      repo: context.repo,
      owner: context.owner,
      comment_id: comment.comment.id
    });

    const nitpickerReactions = reactions.data.filter(
      x => x.user.login === author
    );

    const reactionsToAdd = [...Closed];
    const reactionsToDelete: octokit.ReactionsListForIssueCommentResponseItem[] = [];
    for (const reaction of nitpickerReactions) {
      // Delete 'active' comments
      if (Active.some(x => x === reaction.content)) {
        reactionsToDelete.push(reaction);
        continue;
      }
    }

    // TODO: Clear canned text
    for (const reaction of reactionsToAdd) {
      await octokit.reactions.createForIssueComment({
        repo: context.repo,
        owner: context.owner,
        comment_id: comment.comment.id,
        content: reaction
      });
    }

    for (const reaction of reactionsToDelete) {
      await octokit.reactions.delete({
        reaction_id: reaction.id
      });
    }
  }
}

export async function reactivateComments(
  octokit: github.GitHub,
  comments: MatchResult<PullRequestComment>[]
): Promise<void> {
  core.debug(`reactivating ${comments.length} comments`);

  const context = parseContext();

  if (!context.pullRequest) {
    core.debug('we will only nitpick pull requests');

    return;
  }

  // Write matched comments to pull request
  for (const comment of comments) {
    const cannedTextIndex = comment.comment.body.lastIndexOf(
      cannedTextSeparator
    );
    const markdown = comment.comment.body.substring(0, cannedTextIndex);

    const body = getCommentBody(
      markdown,
      comment.matches,
      context.pullRequest.number,
      context.owner,
      context.repo
    );

    await octokit.issues.updateComment({
      repo: context.repo,
      owner: context.owner,
      comment_id: comment.comment.id,
      body: body
    });

    const reactions = await octokit.reactions.listForIssueComment({
      repo: context.repo,
      owner: context.owner,
      comment_id: comment.comment.id
    });

    const nitpickerReactions = reactions.data.filter(
      x => x.user.login === author
    );

    const reactionsToAdd = [...Active];
    const reactionsToDelete: octokit.ReactionsListForIssueCommentResponseItem[] = [];
    for (const reaction of nitpickerReactions) {
      // Delete 'closed' comments
      if (Closed.some(x => x === reaction.content)) {
        reactionsToDelete.push(reaction);
        continue;
      }
    }

    // TODO: Clear canned text
    for (const reaction of reactionsToAdd) {
      await octokit.reactions.createForIssueComment({
        repo: context.repo,
        owner: context.owner,
        comment_id: comment.comment.id,
        content: reaction
      });
    }

    for (const reaction of reactionsToDelete) {
      await octokit.reactions.delete({
        reaction_id: reaction.id
      });
    }
  }
}

function isCommentApplicable(comment: Comment, changes: Change[]): string[] {
  const results: string[] = [];
  const options: IOptions = { dot: true, nocase: true };

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
      results.push(change.file);
    }
  }

  return results;
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

  return comments.data
    .filter(c => c.user.login === author)
    .map(c => ({
      body: c.body,
      author: c.user.login,
      id: c.id,
      reactions: (c as any).reactions
    }));
}

export function isActiveComment(comment: PullRequestComment): boolean {
  let isActive = true;
  // ensure all 'active'y reactions are there
  for (const active of Active) {
    isActive = isActive && comment.reactions[active] > 0;
  }

  // ensure all 'closed'y reactions are not there
  for (const closed of Closed) {
    isActive = isActive && comment.reactions[closed] === 0;
  }

  return isActive;
}

function getCommentBody(
  markdown: string,
  files: string[],
  prNumber: number,
  owner: string,
  repo: string
): string {
  return `${markdown}${cannedTextSeparator}${files
    .map(
      m =>
        ` - [${m}](https://github.com/${owner}/${repo}/pull/${prNumber}/files)`
    )
    .join('\n')}`;
}
