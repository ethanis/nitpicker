import * as github from '@actions/github';
import * as core from '@actions/core';

export async function getChangedFiles(
  octokit: github.GitHub,
  eventName: string | undefined
): Promise<string[]> {
  if (!eventName) {
    return [];
  }

  switch (eventName) {
    case 'push':
      return getChangedFilesFromSha(octokit);
    default:
      return getChangedFilesFromPR(octokit);
  }
}

async function getChangedFilesFromSha(
  octokit: github.GitHub
): Promise<string[]> {
  const beforeSha = github.context.payload.before;
  const afterSha = github.context.payload.after;
  const owner = github.context.payload.owner?.owner?.name;
  const repo = github.context.payload.repository?.name;

  console.log('Before', beforeSha);
  console.log('After', afterSha);

  if (!beforeSha || !afterSha || !repo || !owner) {
    return [];
  }

  const listFilesResponse = await octokit.repos.compareCommits({
    owner: owner,
    repo: repo,
    base: beforeSha,
    head: afterSha
  });

  const changedFiles = listFilesResponse.data.files.map(f => f.filename);

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug('  ' + file);
  }

  return changedFiles;
}

async function getChangedFilesFromPR(
  octokit: github.GitHub
): Promise<string[]> {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return [];
  }

  const listFilesResponse = await octokit.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: pullRequest.number
  });

  const changedFiles = listFilesResponse.data.map(f => f.filename);

  core.debug('found changed files:');
  for (const file of changedFiles) {
    core.debug('  ' + file);
  }

  return changedFiles;
}
