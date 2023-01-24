import React, { useState } from 'react';
import { css } from 'emotion';
import Check from '@atlaskit/icon/glyph/check';
import Cross from '@atlaskit/icon/glyph/cross';

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

const icon = css({
  height: '15px',
  width: '15px',
});

type InlineEditProps = {
  value: string;
  id: string;
  removeHandler: (value: string) => void;
  editHandler: (id: string, updatedValue: string) => boolean | void;
  hasInlineError: boolean;
  setHasInLineError: React.Dispatch<React.SetStateAction<boolean>>;
};

export const InlineEdit: React.FunctionComponent<InlineEditProps> = ({
  value,
  id,
  editHandler,
  removeHandler,
  hasInlineError,
  setHasInLineError,
}) => {
  const [displayInput, setDisplayInput] = useState<boolean>(false);
  const [editedValue, setEditedValue] = useState<string>(value);

  const cancelHandler = () => {
    setDisplayInput(false);
    setHasInLineError(false);
    setEditedValue(value);
  };
  return (
    <React.Fragment>
      <span style={{ display: displayInput ? 'none' : 'block' }}>
        <span className={valueSpan}>{value}</span>
        <button
          className={editButton}
          onClick={() => {
            setDisplayInput(true);
          }}
        >
          <svg focusable="false" className={icon}>
            <use xlinkHref="#ak-icon-edit" />
          </svg>
        </button>
        <button className={editButton} onClick={() => removeHandler(value)}>
          <svg focusable="false" className={icon}>
            <use xlinkHref="#ak-icon-cross" />
          </svg>
        </button>
      </span>
      <div style={{ display: displayInput ? 'flex' : 'none' }}>
        <div style={{ width: '400px', paddingBottom: '5px' }}>
          <input
            className="ak-field-text"
            type="text"
            name="priority-branch-input"
            id="add-priority-branch-input"
            value={editedValue}
            onChange={(e) => {
              setEditedValue(e.target.value);
            }}
          />
          <div style={{ display: hasInlineError ? 'block' : 'none' }}>
            <p style={{ color: 'red', paddingTop: '2px' }}>Priority branch name already exists.</p>
          </div>
        </div>
        <div style={{ paddingTop: '5px', display: 'flex' }}>
          <button
            className={editButton}
            onClick={() => {
              const validation = editHandler(id, editedValue);
              if (validation === false) {
                setDisplayInput(true);
              } else {
                setDisplayInput(false);
              }
            }}
          >
            <Check label="check" />
          </button>
          <button className={editButton} onClick={cancelHandler}>
            <Cross label="cross" size="small" />
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};
