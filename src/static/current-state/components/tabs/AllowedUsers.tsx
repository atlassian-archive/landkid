import * as React from 'react';
import { User } from '../User';
import { PermissionControl } from '../PermissionControl';

// sort by permssion descending (admin -> land -> read)
function sortUsersByPermission(user1: IPermission, user2: IPermission) {
  const permssionsLevels = ['read', 'land', 'admin'];
  return permssionsLevels.indexOf(user2.mode) - permssionsLevels.indexOf(user1.mode);
}

export type Props = {
  users: IPermission[];
  loggedInUser: ISessionUser;
};

export const AllowedUsers: React.FunctionComponent<Props> = props => (
  <React.Fragment>
    <h3>Allowed Users</h3>
    <table>
      {props.users
        .sort(sortUsersByPermission)
        .map(({ aaid, mode, assignedByAaid, dateAssigned }) => (
          <tr
            key={`Assigned by ${assignedByAaid} on ${dateAssigned}`}
            title={`Assigned by ${assignedByAaid} on ${dateAssigned}`}
          >
            <User aaid={aaid}>
              {user => (
                <React.Fragment>
                  <td>
                    <PermissionControl
                      user={user}
                      userPermission={mode}
                      loggedInUser={props.loggedInUser}
                    />
                  </td>
                  <td style={{ width: '100%' }}>{user.displayName}</td>
                </React.Fragment>
              )}
            </User>
          </tr>
        ))}
    </table>
  </React.Fragment>
);
