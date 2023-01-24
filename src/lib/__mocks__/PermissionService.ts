const mockedPermissionService: any = jest.genMockFromModule('../PermissionService');

export const permissionService = mockedPermissionService.permissionService;
