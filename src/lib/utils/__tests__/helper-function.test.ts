import { validatePriorityBranch } from '../helper-functions';

describe('helper functions', () => {
  const priorityBranchList: IPriorityBranch[] = [
    {
      id: 'test-id',
      branchName: 'test/*',
      adminAaid: 'test-aaid',
      date: '2023-01-25T04:28:07.817Z' as unknown as Date,
    },
    {
      id: 'test-id2',
      branchName: 'test-branch',
      adminAaid: 'test-aaid',
      date: '2023-01-25T04:28:07.817Z' as unknown as Date,
    },
  ];
  test('returns true when source branch matches ANT pattern in priority list', () => {
    expect(validatePriorityBranch(priorityBranchList, 'test/test-branch')).toBe(true);
  });
  test('returns true when source branch matches priority list', () => {
    expect(validatePriorityBranch(priorityBranchList, 'test-branch')).toBe(true);
  });
  test('returns false when source branch does not match in the priority list', () => {
    expect(validatePriorityBranch(priorityBranchList, 'test-branch2')).toBe(false);
  });
});
