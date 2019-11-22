import * as core from '@actions/core';
import { Comment } from '../models';
import { Minimatch, match } from 'minimatch';

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
