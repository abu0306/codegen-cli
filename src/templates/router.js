const fs = require('fs-extra');
const path = require('path');

async function setupRouter() {
  // 创建路由目录结构
  const routesDir = path.join('src', 'routes');
  const pagesDir = path.join('src', 'pages');
  await fs.ensureDir(routesDir);
  await fs.ensureDir(pagesDir);

  // 创建示例页面组件
  const homePage = `
import React from 'react';

export default function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to your Tauri app!</p>
    </div>
  );
}
  `.trim();

  const aboutPage = `
import React from 'react';

export default function About() {
  return (
    <div>
      <h1>About Page</h1>
      <p>This is a Tauri app with React Router.</p>
    </div>
  );
}
  `.trim();

  await fs.outputFile(path.join(pagesDir, 'Home.tsx'), homePage);
  await fs.outputFile(path.join(pagesDir, 'About.tsx'), aboutPage);

  // 创建路由配置
  const routerConfig = `
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from '../pages/Home';
import About from '../pages/About';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
  `.trim();

  await fs.outputFile(path.join(routesDir, 'index.tsx'), routerConfig);

  // 更新 App.tsx 以包含路由
  const appContent = `
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRouter from './routes';

function App() {
  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

export default App;
  `.trim();

  await fs.outputFile('src/App.tsx', appContent);
}

module.exports = {
  setupRouter
}; 