import React from 'react';
import { useState } from 'react';
import { InlineEdit } from '../InlineEdit';
import { css } from 'emotion';
import Info from '@atlaskit/icon/glyph/info';
import Tooltip from '@atlaskit/tooltip';

const wrapper = css({
  paddingTop: '20px',
});

const branchInputWrapper = css({
  width: '400px',
});
const innerWrapper = css({ paddingTop: '10px' });

const headerWrapper = css({ display: 'flex', marginTop: '10px' });

const header = css({ marginBottom: '5px' });

const errorText = css({
  color: 'red',
  paddingTop: '2px',
});

const akButton = css({
  marginTop: '10px',
});

export type PriorityBranchListProps = {
  priorityBranchList: IPriorityBranch[];
  refreshData: () => void;
};

export const PriorityBranchList: React.FunctionComponent<PriorityBranchListProps> = (props) => {
  const [branchName, setBranchName] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const [hasInlineError, setHasInlineError] = useState<boolean>(false);

  const { refreshData, priorityBranchList } = props;

  const branchValidationCheck = (branchName: string, id?: string) => {
    const exists = priorityBranchList.some(
      (item) =>
        (item.branchName === branchName && !id) ||
        (item.branchName === branchName && id && item.id !== id),
    );
    if (id) {
      setHasInlineError(exists);
    } else {
      setHasError(exists);
    }
    return exists;
  };
  const handleAddBranch = () => {
    if (branchValidationCheck(branchName)) return;
    fetch('/api/add-priority-branch', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ branchName }),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          setBranchName('');
          refreshData();
        }
      });
  };

  const handleRemoveBranch = (branchName: string) => {
    fetch('/api/remove-priority-branch', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ branchName }),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          refreshData();
        }
      });
  };

  const handleUpdateBranch = (id: string, updatedBranchName: string) => {
    if (branchValidationCheck(updatedBranchName, id)) return false;
    fetch('/api/update-priority-branch', {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, branchName: updatedBranchName }),
    })
      .then((response) => response.json())
      .then((json) => {
        if (json.error) {
          console.error(json.error);
          window.alert(json.error);
        } else {
          refreshData();
        }
      });
  };

  const errorWrapper = css({ display: hasError ? 'block' : 'none' });
  return (
    <div className={wrapper}>
      <div className={innerWrapper}>
        <h4 className={header}>Priority Branch list</h4>
        {priorityBranchList.map((branch) => (
          <InlineEdit
            data-test-id={`inline-edit-${branch.id}`}
            key={branch.id}
            value={branch.branchName}
            id={branch.id}
            handleEdit={handleUpdateBranch}
            handleRemove={handleRemoveBranch}
            hasInlineError={hasInlineError}
            setHasInLineError={setHasInlineError}
          />
        ))}
      </div>
      <div className={branchInputWrapper}>
        <div className={headerWrapper}>
          <h5 className={header}>Add new branch</h5>
          <Tooltip
            content="Enter branch name or as an ANT pattern e.g. release-candidate/*"
            position="top"
            data-test-id="ant-pattern-tooltip"
          >
            <Info label="info" size="small"></Info>
          </Tooltip>
        </div>
        <input
          className="ak-field-text"
          type="text"
          name="priority-branch-input"
          id="add-priority-branch-input"
          data-test-id="add-priority-branch-input"
          value={branchName}
          onChange={(e) => {
            setHasError(false);
            setBranchName(e.target.value);
          }}
        />
        <div className={errorWrapper}>
          <p className={errorText} data-test-id="error-text">
            Priority branch name already exists.
          </p>
        </div>
        <button
          className={`ak-button ak-button__appearance-default ${akButton}`}
          onClick={() => handleAddBranch()}
          data-test-id="add-priority-branch-button"
        >
          Add priority branch
        </button>
      </div>
    </div>
  );
};
