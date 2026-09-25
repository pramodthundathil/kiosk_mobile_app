import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Safe Storage abstraction to prevent "Native module is null" crashes on Web/Expo Go
const memoryStorageCache: Record<string, string> = {};

export async function storageGetItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    const val = await AsyncStorage.getItem(key);
    return val;
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {}
    }
    return memoryStorageCache[key] || null;
  }
}

export async function storageSetItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch (err) {}
    }
    memoryStorageCache[key] = value;
  }
}

export async function storageRemoveItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (e) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {}
    }
    delete memoryStorageCache[key];
  }
}
