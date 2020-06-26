import * as fs from 'fs';
import { Comment } from '../models';
import { safeLoad } from 'js-yaml';
import { Constants } from '../constants';

export function getConfiguredComments(filePath: string): Comment[] {
  const contents = fs.readFileSync(filePath, 'utf8');
  const yaml: Comment[] = safeLoad(contents);

  const comments: Comment[] = yaml
    .filter(y => y.markdown)
    .map(c => ({
      ...c,
      markdown: `${c.markdown}${c.blocking ? Constants.BlockingText : ''}`,
      pathFilter: c.pathFilter ?? Constants.DefaultPathFilter // Default to match everything
    }));

  return comments;
}
