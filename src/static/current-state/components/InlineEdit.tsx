import React, { useState } from 'react';
import { css } from 'emotion';
import Check from '@atlaskit/icon/glyph/check';
import Cross from '@atlaskit/icon/glyph/cross';
import Edit from '@atlaskit/icon/glyph/edit';

const inputWrapper = css({
  width: '400px',
  paddingBottom: '5px',
});

const editButton = css({
  marginLeft: '5px',
  background: 'none',
  border: 'none',
  padding: '0px',
  verticalAlign: 'middle',
  color: 'darkgray',
  ':focus': { outline: 'none' },
  ':hover': {
    cursor: 'pointer',
    color: 'black',
  },
});

const valueSpan = css({
  marginLeft: '5px',
  marginBottom: '1px',
  color: 'darkgray',
  fontStyle: 'italic',
  verticalAlign: 'middle',
});

const inputButtons = css({
  paddingTop: '5px',
  display: 'flex',
  height: '50px',
});

const errorText = css({
  color: 'red',
  paddingTop: '2px',
});

type InlineEditProps = {
  value: string;
  id: string;
  handleRemove: (value: string) => void;
  handleEdit: (id: string, updatedValue: string) => boolean | void;
  hasInlineError: boolean;
  setHasInLineError: React.Dispatch<React.SetStateAction<boolean>>;
};

export const InlineEdit: React.FunctionComponent<InlineEditProps> = ({
  value,
  id,
  handleEdit,
  handleRemove,
  hasInlineError,
  setHasInLineError,
}) => {
  const [isInputDisplayed, setIsInputDisplayed] = useState<boolean>(false);
  const [editedValue, setEditedValue] = useState<string>(value);

  const defaultSpan = css({
    display: isInputDisplayed ? 'none' : 'block',
  });

  const displayInput = css({
    display: isInputDisplayed ? 'flex' : 'none',
  });

  const errorWrapper = css({
    display: hasInlineError ? 'block' : 'none',
  });

  const handleCancel = () => {
    setIsInputDisplayed(false);
    setHasInLineError(false);
    setEditedValue(value);
  };
  return (
    <React.Fragment>
      <span className={defaultSpan}>
        <span className={valueSpan} data-test-id="priority-branch-name">
          {value}
        </span>
        <button
          className={editButton}
          onClick={() => {
            setIsInputDisplayed(true);
          }}
          data-test-id="edit-priority-branch-button"
        >
          <Edit label="edit" size="small" />
        </button>
        <button
          className={editButton}
          onClick={() => handleRemove(value)}
          data-test-id="priority-branch-remove-button"
        >
          <Cross label="cross" size="small" />
        </button>
      </span>
      <div className={displayInput}>
        <div className={inputWrapper}>
          <input
            className="ak-field-text"
            type="text"
            name="edit-priority-branch-input"
            id="edit-priority-branch-input"
            data-test-id="edit-priority-branch-input"
            value={editedValue}
            onChange={(e) => {
              setEditedValue(e.target.value);
            }}
          />
          <div className={errorWrapper}>
            <p className={errorText} data-test-id="edit-error-text">
              Priority branch name already exists.
            </p>
          </div>
        </div>
        <div className={inputButtons}>
          <button
            className={editButton}
            onClick={() => {
              const validation = handleEdit(id, editedValue);
              if (validation === false) {
                setIsInputDisplayed(true);
              } else {
                setIsInputDisplayed(false);
              }
            }}
            data-test-id="update-edit-button"
          >
            <Check label="check" />
          </button>
          <button className={editButton} onClick={handleCancel} data-test-id="cancel-edit-button">
            <Cross label="cross" size="small" />
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};
