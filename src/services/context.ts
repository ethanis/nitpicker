import * as github from '@actions/github';

export function parseContext() {
  const pullRequest = github.context.payload.pull_request;
  const fullName = github.context.payload.repository?.full_name;
  const parts = fullName?.split('/') ?? [];
  const owner = parts[0];
  const repo = parts[1];
  const sha = pullRequest?.head?.sha ?? github.context.payload.after;

  return {
    pullRequest: pullRequest,
    owner: owner,
    repo: repo,
    sha: sha
  };
}
