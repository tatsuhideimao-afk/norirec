/**
 * Firebase configuration
 * iOS native modules read directly from GoogleService-Info.plist.
 * The Firebase JS SDK uses this config object built from the same values.
 *
 * Required: set API_KEY in GoogleService-Info.plist (get it from Firebase Console
 * → Project Settings → Your apps → Web API Key).
 */

import Constants from 'expo-constants';

const {
  firebaseApiKey,
} = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const FIREBASE_CONFIG = {
  // API key: set via app.json extra.firebaseApiKey or Firebase Console
  apiKey: firebaseApiKey ?? '',

  // Values sourced from GoogleService-Info.plist
  authDomain:        'norirec-99fbc.firebaseapp.com',
  projectId:         'norirec-99fbc',
  storageBucket:     'norirec-99fbc.appspot.com',
  messagingSenderId: '26877863203',
  appId:             '1:26877863203:ios:ba46c0cd8a40a4892b9896',
};
