import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledCourses from '../data/courses.json';

const CUSTOM_COURSES_KEY = 'customCourses';

export async function getCustomCourses(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_COURSES_KEY);
  return raw ? JSON.parse(raw) : [];
}

/** Remembers a free-text course entry locally so it appears in the picker next time. */
export async function rememberCustomCourse(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed || (bundledCourses as string[]).includes(trimmed)) return;
  const existing = await getCustomCourses();
  if (existing.includes(trimmed)) return;
  await AsyncStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify([...existing, trimmed]));
}

export async function getAllCourses(): Promise<string[]> {
  const custom = await getCustomCourses();
  return [...(bundledCourses as string[]), ...custom].sort((a, b) => a.localeCompare(b));
}
