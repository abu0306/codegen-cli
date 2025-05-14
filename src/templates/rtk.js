const fs = require('fs-extra');
const path = require('path');

async function setupRTK() {
  // 创建 store 目录结构
  const storeDir = path.join('src', 'store');
  await fs.ensureDir(storeDir);
  await fs.ensureDir(path.join(storeDir, 'slices'));

  // 创建 store 配置文件
  const storeConfig = `
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
  `.trim();

  await fs.outputFile(path.join(storeDir, 'index.ts'), storeConfig);

  // 创建示例 slice
  const counterSlice = `
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
  `.trim();

  await fs.outputFile(path.join(storeDir, 'slices', 'counterSlice.ts'), counterSlice);

  // 创建 hooks 文件
  const hooks = `
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './index';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  `.trim();

  await fs.outputFile(path.join(storeDir, 'hooks.ts'), hooks);

  // 更新 App.tsx 以包含 Provider
  const appContent = `
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

function App() {
  return (
    <Provider store={store}>
      {/* 你的应用组件 */}
    </Provider>
  );
}

export default App;
  `.trim();

  await fs.outputFile('src/App.tsx', appContent);
}

module.exports = {
  setupRTK
}; 