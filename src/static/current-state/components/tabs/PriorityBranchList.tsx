import React from 'react';
import { useState } from 'react';
import { InlineEdit } from '../InlineEdit';
import { css } from 'emotion';
import Info from '@atlaskit/icon/glyph/info';
import Tooltip from '@atlaskit/tooltip';
const wrapper = css({
  paddingTop: '10px',
  width: '400px',
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
    branchValidationCheck(branchName);
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

  return (
    <div style={{ paddingTop: '20px' }}>
      <div className={wrapper}>
        <h4 style={{ marginBottom: '5px' }}>Priority Branch list</h4>
        {priorityBranchList.map((branch) => (
          <InlineEdit
            key={branch.id}
            value={branch.branchName}
            id={branch.id}
            editHandler={handleUpdateBranch}
            removeHandler={handleRemoveBranch}
            hasInlineError={hasInlineError}
            setHasInLineError={setHasInlineError}
          />
        ))}
      </div>
      <div className={wrapper}>
        <div style={{ display: 'flex' }}>
          <label>
            <h5 style={{ marginBottom: '5px' }}>Add new branch</h5>
          </label>
          <Tooltip
            content="Enter branch name or as an ANT pattern e.g. release-candidate/*"
            position="top"
          >
            <Info label="info" size="small"></Info>
          </Tooltip>
        </div>
        <input
          className="ak-field-text"
          type="text"
          name="priority-branch-input"
          id="add-priority-branch-input"
          value={branchName}
          onChange={(e) => {
            setHasError(false);
            setBranchName(e.target.value);
          }}
        />
        <div style={{ display: hasError ? 'block' : 'none' }}>
          <p style={{ color: 'red', paddingTop: '2px' }}>Priority branch name already exists.</p>
        </div>
        <button
          className="ak-button ak-button__appearance-default"
          style={{
            marginTop: '10px',
          }}
          onClick={() => handleAddBranch()}
        >
          Add priority branch
        </button>
      </div>
    </div>
  );
};
