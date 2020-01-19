import * as github from '@actions/github';
import { parseContext } from './context';
import { Conclusion } from '../models';

export async function startCheck(octokit: github.GitHub) {
  const context = parseContext();

  const result = await octokit.checks.create({
    owner: context.owner,
    repo: context.repo,
    name: 'nitpicker',
    head_sha: context.sha,
    status: 'in_progress'
  });

  return result.data;
}

export async function completeCheck(
  octokit: github.GitHub,
  checkId: number,
  conclusion: Conclusion
) {
  const context = parseContext();

  await octokit.checks.update({
    owner: context.owner,
    repo: context.repo,
    check_run_id: checkId,
    conclusion: conclusion
  });
}
