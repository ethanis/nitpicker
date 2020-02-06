import * as github from '@actions/github';
import * as core from '@actions/core';
import {
  Change,
  MatchResult,
  PullRequestComment,
  Conclusion,
  ChangeType,
  Comment
} from '../models';
import { getExistingComments, isActiveComment } from '.';
import { IOptions, Minimatch } from 'minimatch';
import { Constants } from '../constants';

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

    const commentMatchText = `${comment.markdown}${Constants.CannedTextSeparator}`;
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
