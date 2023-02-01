import React from 'react';
import { useState } from 'react';
import { InlineEdit } from '../InlineEdit';
import { css } from 'emotion';
import Info from '@atlaskit/icon/glyph/info';
import Tooltip from '@atlaskit/tooltip';

const wrapper = css({
  paddingTop: '20px',
  width: '400px',
});

const innerWrapper = css({ paddingTop: '10px', width: '400px' });

const labelWrapper = css({ display: 'flex' });

const h4 = css({ marginBottom: '5px' });

const h5 = css({
  marginBottom: '5px',
});

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
        <h4 className={h4}>Priority Branch list</h4>
        {priorityBranchList.map((branch) => (
          <InlineEdit
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
      <div className={wrapper}>
        <div className={labelWrapper}>
          <label>
            <h5 className={h5}>Add new branch</h5>
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
        <div className={errorWrapper}>
          <p className={errorText}>Priority branch name already exists.</p>
        </div>
        <button
          className={`ak-button ak-button__appearance-default ${akButton}`}
          onClick={() => handleAddBranch()}
        >
          Add priority branch
        </button>
      </div>
    </div>
  );
};
