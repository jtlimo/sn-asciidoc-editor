import { createRoot } from 'react-dom/client';
import { AsciiDocEditor } from './editor/AsciiDocEditor';
import { SNBridge } from './sn/bridge';
import './index.scss';

const bridge = new SNBridge();
const container = document.getElementById('root');

if (container) {
  void bridge.registered.then(() => {
    createRoot(container).render(<AsciiDocEditor bridge={bridge} />);
  });
}
