// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys used across the app
export const KEYS = {
  users: 'lm_users',
  currentUser: 'lm_current_user',
  remembered: 'lm_remembered',
};

// Gets the users array from storage
// Returns an empty array if nothing is stored yet
export async function getUsers() {
  const data = await AsyncStorage.getItem(KEYS.users);
  return data ? JSON.parse(data) : [];
}

// Saves the users array to storage
export async function saveUsers(users) {
  await AsyncStorage.setItem(KEYS.users, JSON.stringify(users));
}

// Finds one user by username (case-insensitive)
export async function findUser(username) {
  const users = await getUsers();
  return users.find(
    u => u.username.toLowerCase() === username.toLowerCase()
  );
}

// Saves the currently logged-in username
export async function setCurrentUser(username) {
  await AsyncStorage.setItem(KEYS.currentUser, username);
}

// Gets the currently logged-in username, or null
export async function getCurrentUser() {
  return await AsyncStorage.getItem(KEYS.currentUser);
}

// Removes the session (logs out)
export async function clearCurrentUser() {
  await AsyncStorage.removeItem(KEYS.currentUser);
}



// Seeds a default admin account on first run
export async function seedDefaultUser() {
  const users = await getUsers();
  if (users.length === 0) {
    await saveUsers([{
      username: 'admin',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      question: 'What is your favorite food?',
      answer: 'laundry',
    }]);
  }
}