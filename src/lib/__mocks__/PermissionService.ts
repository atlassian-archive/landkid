const mockedPermissionService: any = jest.genMockFromModule('../PermissionService');

export const permissionService = mockedPermissionService.permissionService;
permissionService.getUsersPermissions.mockResolvedValueOnce([]);
permissionService.getPermissionForUser.mockResolvedValueOnce('read');
