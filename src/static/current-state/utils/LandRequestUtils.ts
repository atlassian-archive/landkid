export const getGroupedByTargetBranch = (updates: IStatusUpdate[]) => {
  const grouped: { [branch: string]: IStatusUpdate[] } = {};
  updates.forEach((item) => {
    const targetBranch = item.request.pullRequest.targetBranch || item.requestId;
    grouped[targetBranch] = grouped[targetBranch] || [];
    grouped[targetBranch].push(item);
  });
  return grouped;
};
