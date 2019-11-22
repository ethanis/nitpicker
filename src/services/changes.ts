import * as github from '@actions/github';

export async function getChangedFiles(
  octokit: github.GitHub,
  eventName: string | undefined
): Promise<void> {
  if (!eventName) {
    return;
  }

  const changedFiles: string[] = [];

  switch (eventName) {
    case 'push':
      break;
    default:
      break;
  }
}

async function getChangedFilesFromSha(octokit: github.GitHub): Promise<void> {
  const sha = process.env.GITHUB_EVENT_PATH;
}
