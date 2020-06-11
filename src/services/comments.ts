import * as github from '@actions/github';
import * as core from '@actions/core';
import * as crypto from 'crypto';
import { Comment, PullRequestComment, MatchResult } from '../models';
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

    await octokit.issues.createComment({
      repo: context.repo,
      owner: context.owner,
      issue_number: context.pullRequest.number,
      body: body
    });
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
      id: c.id
    }));
}

export function getCommentBody(
  markdown: string,
  files: string[],
  prNumber: number,
  owner: string,
  repo: string
): string {
  // const hasher = crypto.createHash('md5');
  const links = files.map(file => ({
    text: file,
    hash: crypto
      .createHash('md5')
      .update(file)
      .digest('hex')
  }));

  return `${markdown}${Constants.CannedTextSeparator}${links
    .map(
      link =>
        ` - [${link.text}](https://github.com/${owner}/${repo}/pull/${prNumber}/files#diff-${link.hash})`
    )
    .join('\n')}`;
}
