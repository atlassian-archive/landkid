import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './components/App';

let container = document.getElementById('app');
if (container) {
  ReactDOM.render(
    <div
      style={{
        border: '2px solid green',
        borderRadius: '5px',
        padding: '10px',
        fontSize: '16px',
      }}
    >
      <App />
    </div>,
    container,
  );
}
