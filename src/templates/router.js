const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function setupRouter(template) {
  const isTypeScript = template === 'react-ts';
  const pageExt = isTypeScript ? 'tsx' : 'jsx';
  const routesExt = isTypeScript ? 'tsx' : 'jsx';
  const appExt = isTypeScript ? 'tsx' : 'jsx';

  const routesDir = path.join('src', 'routes');
  const pagesDir = path.join('src', 'pages');
  await fs.ensureDir(routesDir);
  await fs.ensureDir(pagesDir);

  // --- Create Page Components ---
  const homePageComponentContent = `
import React from 'react';

${isTypeScript ? 'const Home: React.FC = () => {' : 'export default function Home() {'}
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to your Tauri app!</p>
    </div>
  );
}
${isTypeScript ? '\nexport default Home;' : ''}
  `.trim();

  const aboutPageComponentContent = `
import React from 'react';

${isTypeScript ? 'const About: React.FC = () => {' : 'export default function About() {'}
  return (
    <div>
      <h1>About Page</h1>
      <p>This is a Tauri app with React Router.</p>
    </div>
  );
}
${isTypeScript ? '\nexport default About;' : ''}
  `.trim();

  await fs.outputFile(path.join(pagesDir, `Home.${pageExt}`), homePageComponentContent);
  await fs.outputFile(path.join(pagesDir, `About.${pageExt}`), aboutPageComponentContent);
  console.log(chalk.green(`Created page components in src/pages (Home.${pageExt}, About.${pageExt})`));

  // --- Create Router Configuration (AppRouter) ---
  const routerConfigFileContent = `
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from '../pages/Home'; // Node will resolve .jsx or .tsx
import About from '../pages/About'; // Node will resolve .jsx or .tsx

${isTypeScript ? 'const AppRouter: React.FC = () => {' : 'export default function AppRouter() {'}
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

        <hr />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
${isTypeScript ? '\nexport default AppRouter;' : ''}
  `.trim();

  await fs.outputFile(path.join(routesDir, `index.${routesExt}`), routerConfigFileContent);
  console.log(chalk.green(`Created router configuration in src/routes/index.${routesExt}`));

  // --- Update App.{jsx|tsx} to include AppRouter ---
  const appFilePath = path.join('src', `App.${appExt}`);
  let appFileContent = '';
  try {
    appFileContent = await fs.readFile(appFilePath, 'utf8');
  } catch (error) {
    console.warn(chalk.yellow(`Warning: ${appFilePath} not found. Creating a new one.`));
    // If App file doesn't exist, RTK wasn't run or didn't create it.
    // So, create a simple App file that just renders AppRouter.
    appFileContent = `
import React from 'react';
import AppRouter from './routes';

${isTypeScript ? 'const App: React.FC = () => {' : 'function App() {'}
  return <AppRouter />;
}

export default App;
    `.trim();
  }

  // Check if AppRouter is already imported and used
  if (appFileContent.includes('import AppRouter from ') && appFileContent.includes('<AppRouter />')) {
    console.log(chalk.blue(`${appFilePath} already seems to include AppRouter. Skipping modification.`));
  } else {
    const importAppRouter = `import AppRouter from './routes'; // Will resolve .jsx or .tsx`;
    
    // Add import if not already there (basic check)
    if (!appFileContent.includes(importAppRouter)) {
        // Try to add import at the top with other imports
        const importReactMatch = appFileContent.match(/^import React[^;]*;/m);
        if (importReactMatch) {
            appFileContent = appFileContent.replace(importReactMatch[0], `${importReactMatch[0]}\n${importAppRouter}`);
        } else {
            // Prepend if no React import found (less ideal)
            appFileContent = `${importAppRouter}\n${appFileContent}`;
        }
    }

    // Integrate <AppRouter />
    if (appFileContent.includes('<Provider store={store}>')) {
      // RTK Provider exists, inject AppRouter inside it
      // Look for a placeholder comment or a common pattern
      const rtkPlaceholder = '{\/* Your existing app structure or <AppRouter /> if using router */}';
      const tauriWelcomePlaceholder = '{/* Replace div below with <AppRouter /> if you have routing enabled */}';
      const genericDivPlaceholder = '<div>\n        <h1>Welcome to Tauri!</h1>'; // From RTK template

      if (appFileContent.includes(rtkPlaceholder)) {
        appFileContent = appFileContent.replace(rtkPlaceholder, '<AppRouter />');
      } else if (appFileContent.includes(tauriWelcomePlaceholder)) {
        appFileContent = appFileContent.replace(tauriWelcomePlaceholder, '<AppRouter />');
         // Also remove the now-redundant div that contained the placeholder
        appFileContent = appFileContent.replace(/<div>\s*<AppRouter \/>\s*<\/div>/, '<AppRouter />'); 
      } else if (appFileContent.includes(genericDivPlaceholder)) {
        // Replace the generic welcome div with AppRouter
        appFileContent = appFileContent.replace(genericDivPlaceholder, '<AppRouter />\n      </div>'); 
        // This is a bit crude, might need refinement for cleaner replacement
        appFileContent = appFileContent.replace(/<p>Edit src\/App\.(jsx|tsx) and save to reload\.<\/p>[^<]*<p>Redux Toolkit is set up\.[^<]*<\/p>[^<]*(\{\s*\/\* Example component[^}]*\*\/\}\s*)?<\/div>/, '');
      } else {
        // Fallback: try to wrap the Provider's children, or append if it's too complex
        // This part can be tricky and might need a more robust AST-based modification
        appFileContent = appFileContent.replace(
          /(<Provider[^>]*>)([^<]*)(<\/Provider>)/,
          '$1\n      <AppRouter />\n    $3'
        );
        console.warn(chalk.yellow(`Attempted to inject AppRouter into existing Provider in ${appFilePath}, please verify.`));
      }
    } else {
      // No RTK Provider, or App file was newly created. Overwrite with basic App + AppRouter structure.
      appFileContent = `
import React from 'react';
import AppRouter from './routes';

${isTypeScript ? 'const App: React.FC = () => {' : 'function App() {'}
  return <AppRouter />;
}

export default App;
      `.trim();
    }
    await fs.outputFile(appFilePath, appFileContent.trim());
    console.log(chalk.green(`${appFilePath} has been updated/created to include AppRouter.`));
  }
}

module.exports = {
  setupRouter
}; 