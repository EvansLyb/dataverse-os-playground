import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { createLogger } from "redux-logger";
import { Middleware } from "redux";
import {
  createStateSyncMiddleware,
  initMessageListener,
} from "redux-state-sync";

import { identitySlice } from "./identity/slice";
import { postSlice } from "./post/slice";
import { folderSlice } from "./folder/slice";
import { fileSlice } from "./file/slice";
import { privacySettingsSlice } from "./privacySettings/slice";
import { noExtensionSlice } from "./noExtension/slice";
import { lensProfileSlice } from "./lensProfile/slice";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["post"],
};

const rootReducer = combineReducers({
  identity: identitySlice.reducer,
  post: postSlice.reducer,
  folder: folderSlice.reducer,
  file: fileSlice.reducer,
  privacySettings: privacySettingsSlice.reducer,
  noExtension: noExtensionSlice.reducer,
  lensProfile: lensProfileSlice.reducer,
});

// 使用persistReducer强化reducer,persistReducer(config, reducer)
const persistedReducer = persistReducer(persistConfig, rootReducer);

const middlewares: Array<Middleware> = [createStateSyncMiddleware()];
// middlewares.push(
//   createLogger({
//     level: "debug",
//     duration: true,
//     diff: true,
//   })
// );

const store = configureStore({
  reducer: persistedReducer,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // serializableCheck: {
      //   // Ignore these action types
      //   ignoredActions: ['your/action/type'],
      //   // Ignore these field paths in all actions
      //   ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
      //   // Ignore these paths in the state
      //   ignoredPaths: ['items.dates'],
      // },
      serializableCheck: false,
    }).concat(middlewares),
});

initMessageListener(store);

const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export default { store, persistor };
