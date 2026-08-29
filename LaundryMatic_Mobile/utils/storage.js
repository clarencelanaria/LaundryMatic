// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// The only thing left here — pre-filling the email field on the
// login screen. Actual login state now lives in Firebase Auth
// (see utils/firebase.js), not in local storage.
const REMEMBERED_KEY = 'lm_remembered';

export async function getRememberedEmail() {
  return await AsyncStorage.getItem(REMEMBERED_KEY);
}

export async function setRememberedEmail(email) {
  await AsyncStorage.setItem(REMEMBERED_KEY, email);
}

export async function clearRememberedEmail() {
  await AsyncStorage.removeItem(REMEMBERED_KEY);
}