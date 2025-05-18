const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

async function setupRouter(template) {
  const isTypeScript = template === "react-ts";
  const pageExt = isTypeScript ? "tsx" : "jsx";
  const routesExt = isTypeScript ? "tsx" : "jsx";
  const appExt = isTypeScript ? "tsx" : "jsx";

  const routesDir = path.join("src", "routes");
  const pagesDir = path.join("src", "pages");
  await fs.ensureDir(routesDir);
  await fs.ensureDir(pagesDir);

  const homePageComponentContent = `
import React from 'react';

${
  isTypeScript
    ? "const Home: React.FC = () => {"
    : "export default function Home() {"
}
  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to your Tauri app!</p>
    </div>
  );
}
${isTypeScript ? "\nexport default Home;" : ""}
  `.trim();

  const aboutPageComponentContent = `
import React from 'react';

${
  isTypeScript
    ? "const About: React.FC = () => {"
    : "export default function About() {"
}
  return (
    <div>
      <h1>About Page</h1>
      <p>This is a Tauri app with React Router.</p>
    </div>
  );
}
${isTypeScript ? "\nexport default About;" : ""}
  `.trim();

  await fs.outputFile(
    path.join(pagesDir, `Home.${pageExt}`),
    homePageComponentContent
  );
  await fs.outputFile(
    path.join(pagesDir, `About.${pageExt}`),
    aboutPageComponentContent
  );
  console.log(
    chalk.green(
      `Created page components in src/pages (Home.${pageExt}, About.${pageExt})`
    )
  );

  const routerConfigFileContent = `
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home'; 
import About from '@/pages/About'; 

${
  isTypeScript
    ? "const AppRouter: React.FC = () => {"
    : "export default function AppRouter() {"
}
  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
    </BrowserRouter>
  );
}
${isTypeScript ? "\nexport default AppRouter;" : ""}
  `.trim();

  await fs.outputFile(
    path.join(routesDir, `index.${routesExt}`),
    routerConfigFileContent
  );
  console.log(
    chalk.green(`Created router configuration in src/routes/index.${routesExt}`)
  );

  const appFilePath = path.join("src", `App.${appExt}`);
  let appFileContent = "";
  try {
    appFileContent = await fs.readFile(appFilePath, "utf8");
  } catch (error) {
    console.warn(
      chalk.yellow(`Warning: ${appFilePath} not found. Creating a new one.`)
    );
    appFileContent = `
import React from 'react';
import AppRouter from '@/routes';

${isTypeScript ? "const App: React.FC = () => {" : "function App() {"}
  return <AppRouter />;
}

export default App;
    `.trim();
  }

  if (
    appFileContent.includes("import AppRouter from ") &&
    appFileContent.includes("<AppRouter />")
  ) {
    console.log(
      chalk.blue(
        `${appFilePath} already seems to include AppRouter. Skipping modification.`
      )
    );
  } else {
    const importAppRouter = `import AppRouter from './routes'; // Will resolve .jsx or .tsx`;

    if (!appFileContent.includes(importAppRouter)) {
      const importReactMatch = appFileContent.match(/^import React[^;]*;/m);
      if (importReactMatch) {
        appFileContent = appFileContent.replace(
          importReactMatch[0],
          `${importReactMatch[0]}\n${importAppRouter}`
        );
      } else {
        appFileContent = `${importAppRouter}\n${appFileContent}`;
      }
    }

    if (appFileContent.includes("<Provider store={store}>")) {
      const rtkPlaceholder =
        "{/* Your existing app structure or <AppRouter /> if using router */}";
      const tauriWelcomePlaceholder =
        "{/* Replace div below with <AppRouter /> if you have routing enabled */}";
      const genericDivPlaceholder = "<div>\n        <h1>Welcome to Tauri!</h1>";

      if (appFileContent.includes(rtkPlaceholder)) {
        appFileContent = appFileContent.replace(
          rtkPlaceholder,
          "<AppRouter />"
        );
      } else if (appFileContent.includes(tauriWelcomePlaceholder)) {
        appFileContent = appFileContent.replace(
          tauriWelcomePlaceholder,
          "<AppRouter />"
        );
        appFileContent = appFileContent.replace(
          /<div>\s*<AppRouter \/>\s*<\/div>/,
          "<AppRouter />"
        );
      } else if (appFileContent.includes(genericDivPlaceholder)) {
        appFileContent = appFileContent.replace(
          genericDivPlaceholder,
          "<AppRouter />\n      </div>"
        );
        appFileContent = appFileContent.replace(
          /<p>Edit src\/App\.(jsx|tsx) and save to reload\.<\/p>[^<]*<p>Redux Toolkit is set up\.[^<]*<\/p>[^<]*(\{\s*\/\* Example component[^}]*\*\/\}\s*)?<\/div>/,
          ""
        );
      } else {
        appFileContent = appFileContent.replace(
          /(<Provider[^>]*>)([^<]*)(<\/Provider>)/,
          "$1\n      <AppRouter />\n    $3"
        );
        console.warn(
          chalk.yellow(
            `Attempted to inject AppRouter into existing Provider in ${appFilePath}, please verify.`
          )
        );
      }
    } else {
      appFileContent = `
import React from 'react';
import AppRouter from '@/routes';

${isTypeScript ? "const App: React.FC = () => {" : "function App() {"}
  return <AppRouter />;
}

export default App;
      `.trim();
    }
    await fs.outputFile(appFilePath, appFileContent.trim());
    console.log(
      chalk.green(
        `${appFilePath} has been updated/created to include AppRouter.`
      )
    );
  }
}

module.exports = {
  setupRouter,
};
