/*
  Helper functions
*/

// validates if a given source branch name is a priority branch
export const validatePriorityBranch = (
  priorityBranches: IPriorityBranch[],
  sourceBranch: string,
): boolean => {
  return priorityBranches.some((branch) => {
    if (branch.branchName === sourceBranch) return true;
    //check if branch name matches on a priority branch as an ANT pattern
    const antPatternMatcher = branch.branchName.split('*');
    if (antPatternMatcher.length > 1) {
      const patternRegex = new RegExp(`^${antPatternMatcher[0]}`);
      if (patternRegex.test(sourceBranch)) return true;
    }
    return false;
  });
};
