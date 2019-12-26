import * as github from '@actions/github';
import * as core from '@actions/core';
import { Change, ChangeType } from '../models';

export async function getChangedFiles(
  octokit: github.GitHub,
  eventName: string | undefined
): Promise<Change[]> {
  if (!eventName) {
    return [];
  }

  switch (eventName) {
    case 'push':
      return getChangesFromSha(octokit);
    default:
      return getChangesFromPR(octokit);
  }
}

async function getChangesFromSha(octokit: github.GitHub): Promise<Change[]> {
  const beforeSha = github.context.payload.before;
  const afterSha = github.context.payload.after;
  const owner = github.context.payload.repository?.owner?.name;
  const repo = github.context.payload.repository?.name;

  if (!beforeSha || !afterSha || !repo || !owner) {
    return [];
  }

  const listFilesResponse = await octokit.repos.compareCommits({
    owner: owner,
    repo: repo,
    base: beforeSha,
    head: afterSha
  });

  const changes = listFilesResponse.data.files.map(f => ({
    file: f.filename,
    changeType: parseStatus(f.status)
  }));

  core.debug('found changed files:');
  for (const change of changes) {
    core.debug('  ' + change.file);
  }

  return changes;
}

async function getChangesFromPR(octokit: github.GitHub): Promise<Change[]> {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return [];
  }

  const listFilesResponse = await octokit.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pullRequest.number
  });

  const changes = listFilesResponse.data.map(f => ({
    file: f.filename,
    changeType: parseStatus(f.status)
  }));

  core.debug('found changed files:');
  for (const change of changes) {
    core.debug('  ' + change.file);
  }

  return changes;
}

function parseStatus(status: string): ChangeType {
  switch (status) {
    case 'added':
      return ChangeType.add;
    case 'modified':
      return ChangeType.edit;
    default:
      return ChangeType.any;
  }
}
