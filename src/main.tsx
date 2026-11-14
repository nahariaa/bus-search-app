import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

const root = document.getElementById('root')!;
const app = <HelmetProvider><BrowserRouter><App /></BrowserRouter></HelmetProvider>;
if (root.dataset.rendered === 'true') hydrateRoot(root, app);
else createRoot(root).render(app);
