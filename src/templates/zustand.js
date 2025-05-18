const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

async function setupZustand(template) {
  const isTypeScript = template === "react-ts";
  const ext = isTypeScript ? "ts" : "js";
  const appExt = isTypeScript ? "tsx" : "jsx";

  const storeDir = path.join("src", "store");
  await fs.ensureDir(storeDir);

  let storeContent;
  if (isTypeScript) {
    storeContent = `
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementByAmount: (amount: number) => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementByAmount: (amount) => set((state) => ({ count: state.count + amount })),
}));
`;
  } else {
    storeContent = `
import { create } from 'zustand';

export const useCounterStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementByAmount: (amount) => set((state) => ({ count: state.count + amount })),
}));
`;
  }

  await fs.outputFile(path.join(storeDir, `counterStore.${ext}`), storeContent.trim());

  const appFilePath = path.join("src", `App.${appExt}`);
  let existingAppContent = "";
  try {
    existingAppContent = await fs.readFile(appFilePath, "utf8");
  } catch (e) {
    console.warn(
      chalk.yellow(
        `Warning: Could not read ${appFilePath}. A new App file might be created or an existing one might be simpler than expected.`
      )
    );
  }

  if (existingAppContent.includes("useCounterStore")) {
    console.log(
      chalk.blue(
        `Zustand store usage already seems to be in ${appFilePath}. Skipping App file modification.`
      )
    );
  } else {
    const appContent = `
import React from 'react';
import { useCounterStore } from '@/store/counterStore';

function App() {
  const { count, increment, decrement } = useCounterStore();

  return (
    <div>
      <h1>Welcome to Tauri!</h1>
      <p>Edit src/App.${appExt} and save to reload.</p>
      <p>Zustand is set up. You can use the store hooks to manage state.</p>
      <div>
        <p>Count: {count}</p>
        <button onClick={increment}>Increment</button>
        <button onClick={decrement}>Decrement</button>
      </div>
    </div>
  );
}

export default App;
`;
    await fs.outputFile(appFilePath, appContent.trim());
    console.log(
      chalk.green(
        `${appFilePath} has been updated/created with Zustand store usage.`
      )
    );
  }
}

module.exports = {
  setupZustand,
}; 