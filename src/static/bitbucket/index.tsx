import * as ReactDOM from 'react-dom';
import App from './components/App';

let container = document.getElementById('app');
if (container) {
  ReactDOM.render(<App />, container);
}
