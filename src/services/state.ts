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
import { getExistingComments } from '.';
import { IOptions, Minimatch, match } from 'minimatch';
import { Constants } from '../constants';

const pathModifiers = ['!', '+', '-', '~'];

export async function getTargetState(
  octokit: github.GitHub,
  allComments: Comment[],
  changes: Change[]
): Promise<{
  commentsToAdd: MatchResult<Comment>[];
  commentsToUpdate: MatchResult<PullRequestComment>[];
  commentsToResolve: MatchResult<PullRequestComment>[];
  conclusion: Conclusion;
}> {
  const commentsToAdd: MatchResult<Comment>[] = [];
  const commentsToUpdate: MatchResult<PullRequestComment>[] = [];
  const commentsToResolve: MatchResult<PullRequestComment>[] = [];

  let conclusion: Conclusion = 'success';

  const existingComments: PullRequestComment[] = await getExistingComments(
    octokit
  );

  for (const comment of allComments) {
    const matchedFiles = getMatchingFilePaths(comment, changes);
    const matchedContent = getMatchingContentChanges(comment, matchedFiles);
    const matches = matchedContent.map(m => m.file);

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

    // If comment exists, update comment
    for (const previousComment of existing) {
      // Ensure comment canned text is current
      if (isApplicable) {
        commentsToUpdate.push({
          comment: previousComment,
          matches: matches
        });
      } else {
        commentsToResolve.push({
          comment: previousComment,
          matches: matches
        });
      }
    }
  }

  return {
    commentsToAdd: commentsToAdd,
    commentsToUpdate: commentsToUpdate,
    commentsToResolve: commentsToResolve,
    conclusion: conclusion
  };
}

export function getMatchingFilePaths(
  comment: Comment,
  changes: Change[]
): Change[] {
  const results: Change[] = [];
  const options: IOptions = { dot: true, nocase: true };

  const inclusions: string[] = [];
  const exclusions: string[] = [];

  for (const pathFilter of comment.pathFilter) {
    if (pathFilter.startsWith('!')) {
      exclusions.push(pathFilter.substring(1));
    } else {
      inclusions.push(pathFilter);
    }

    if (pathModifiers.includes(pathFilter[1])) {
      throw new Error('Multiple path modifiers are not supported');
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
    for (const exclusion of exclusions) {
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
      results.push(change);
    }
  }

  return results;
}

export function getMatchingContentChanges(
  comment: Comment,
  changes: Change[]
): Change[] {
  // if contentFilter isn't defined, return everything
  if (!comment.contentFilter) {
    return changes;
  }

  const matches: Change[] = [];

  console.log('you found me!');

  for (const change of changes) {
    for (const contentFilter of comment.contentFilter) {
      try {
        const regex = new RegExp(contentFilter);
        if (regex.test(change.patch)) {
          matches.push(change);
          break;
        }
      } catch (SyntaxError) {
        throw Error(`Unable to parse regex expression: ${contentFilter}`);
      }
    }
  }

  return matches;
}
