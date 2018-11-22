import { Permission } from '../db';
import { config } from './Config';

class PermissionService {
  getPermissionForUser = async (aaid: string): Promise<IPermissionMode> => {
    const permission = await Permission.findOne<Permission>({
      where: {
        aaid,
      },
      order: [['dateAssigned', 'DESC']],
    });

    if (!permission) {
      const defaultMode: IPermissionMode = config.landkidAdmins.includes(aaid)
        ? 'admin'
        : 'read';
      await Permission.create({
        aaid,
        mode: defaultMode,
      });
      return defaultMode;
    }

    return permission.mode;
  };
}

export const permissionService = new PermissionService();
