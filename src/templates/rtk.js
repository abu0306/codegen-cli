const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function setupRTK(template) {
  const isTypeScript = template === 'react-ts';
  const ext = isTypeScript ? 'ts' : 'js';
  const appExt = isTypeScript ? 'tsx' : 'jsx';

  const storeDir = path.join('src', 'store');
  await fs.ensureDir(storeDir);
  await fs.ensureDir(path.join(storeDir, 'slices'));

  let storeConfig = `
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});
`;

  if (isTypeScript) {
    storeConfig += `
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
  } else {
    storeConfig += `
// JSDoc types for JS (optional):
// /** @type {import('@reduxjs/toolkit').EnhancedStore} */
// export const store;
// /** @type {() => import('./store').RootState} */
// export const getState = store.getState;
// /** @type {import('./store').AppDispatch} */
// export const dispatch = store.dispatch;
`;
  }

  await fs.outputFile(path.join(storeDir, `index.${ext}`), storeConfig.trim());

  let counterSliceContent;
  if (isTypeScript) {
    counterSliceContent = `
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
`;
  } else {
    counterSliceContent = `
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  value: 0,
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    // For JS, action type is inferred or can be documented with JSDoc
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
`;
  }
  await fs.outputFile(path.join(storeDir, 'slices', `counterSlice.${ext}`), counterSliceContent.trim());

  let hooksContent;
  if (isTypeScript) {
    hooksContent = `
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
  } else {
    hooksContent = `
import { useDispatch, useSelector } from 'react-redux';
// For JSDoc (optional)
// import type { AppDispatch, RootState } from './index'; // Will resolve to .js

/** @type {() => import('./index').AppDispatch} */
export const useAppDispatch = () => useDispatch();
/** @type {import('react-redux').TypedUseSelectorHook<import('./index').RootState>} */
export const useAppSelector = useSelector;
`;
  }
  await fs.outputFile(path.join(storeDir, `hooks.${ext}`), hooksContent.trim());

  const appFilePath = path.join('src', `App.${appExt}`);
  let existingAppContent = '';
  try {
    existingAppContent = await fs.readFile(appFilePath, 'utf8');
  } catch (e) {
    console.warn(chalk.yellow(`Warning: Could not read ${appFilePath}. A new App file might be created or an existing one might be simpler than expected.`));
  }

  // More robust check for Provider and basic App structure
  // This is still a heuristic and might not cover all cases perfectly.
  if (existingAppContent.includes('<Provider store={store}>') && existingAppContent.includes('./store')) {
    console.log(chalk.blue(`Redux Provider setup already seems to be in ${appFilePath}. Skipping App file modification for RTK.`));
  } else {
    // Determine if AppRouter is likely to be used (if router feature was also selected)
    // This is a placeholder, as direct knowledge of other features isn't available here.
    // Ideally, the main createProject orchestrator would handle App.jsx/tsx modifications.
    const routerImport = isTypeScript ? '// import AppRouter from \'@/routes\'; // Uncomment if router is set up' : '// import AppRouter from \'@/routes\'; // Uncomment if router is set up';
    const routerComponent = '{/* <AppRouter /> */}'; 

    const appContent = `
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store'; 
${routerImport}

function App() {
  return (
    <Provider store={store}>
      {/* Replace div below with <AppRouter /> if you have routing enabled */}
      <div>
        <h1>Welcome to Tauri!</h1>
        <p>Edit src/App.${appExt} and save to reload.</p>
        <p>Redux Toolkit is set up. You can dispatch actions and select state.</p>
    </Provider>
  );
}

export default App;
`;
    await fs.outputFile(appFilePath, appContent.trim());
    console.log(chalk.green(`${appFilePath} has been updated/created with Redux Provider.`));
  }
}

module.exports = {
  setupRTK
}; 