import * as github from '@actions/github';
import * as core from '@actions/core';
import * as octokit from '@octokit/rest';
import {
  Comment,
  PullRequestComment,
  Closed,
  Active,
  MatchResult
} from '../models';
import { parseContext } from './context';
import { Constants } from '../constants';

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
    const cannedTextIndex = comment.comment.body.lastIndexOf(
      Constants.CannedTextSeparator
    );

    const body = getCommentBody(
      comment.comment.body.substring(0, cannedTextIndex),
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
      Constants.CannedTextSeparator
    );

    const body = `${comment.comment.body.substring(0, cannedTextIndex)}${
      Constants.ResolvedText
    }`;

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
      x => x.user.login === Constants.Author
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
      Constants.CannedTextSeparator
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
      x => x.user.login === Constants.Author
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

export async function getExistingComments(
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
    .filter(c => c.user.login === Constants.Author)
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
  return `${markdown}${Constants.CannedTextSeparator}${files
    .map(
      m =>
        ` - [${m}](https://github.com/${owner}/${repo}/pull/${prNumber}/files)`
    )
    .join('\n')}`;
}
