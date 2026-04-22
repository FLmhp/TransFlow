import { render } from 'solid-js/web';
import { App } from './App.jsx';
import { initSettings } from '../shared/settings-store.js';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

void initSettings();
render(() => <App />, root);
