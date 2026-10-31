import { useSettingsStore } from '../store/settingsStore';

export type ThemeColors = {
  bg: string;           // Page/list background
  card: string;         // Card/section background
  text: string;         // Primary text
  textSub: string;      // Secondary text
  border: string;       // Divider
  inputBg: string;      // Input background
  sheetBg: string;      // Bottom sheet background
  modalBg: string;      // Modal/panel background
  modalText: string;    // Modal primary text
  modalTextSub: string; // Modal secondary text
  modalBorder: string;  // Modal divider
  placeholder: string;  // Placeholder background (image loading)
  iconDefault: string;  // Default icon color
  danger: string;       // Destructive action color
};

const light: ThemeColors = {
  bg: '#f4f4f4',
  card: '#fff',
  text: '#212121',
  textSub: '#999',
  border: '#eee',
  inputBg: '#f0f0f0',
  sheetBg: '#fff',
  modalBg: '#fff',
  modalText: '#212121',
  modalTextSub: '#555',
  modalBorder: '#eee',
  placeholder: '#ddd',
  iconDefault: '#999',
  danger: '#ff4757',
};

const dark: ThemeColors = {
  bg: '#0f0f0f',
  card: '#1a1a1a',
  text: '#e0e0e0',
  textSub: '#666',
  border: '#2a2a2a',
  inputBg: '#2a2a2a',
  sheetBg: '#222',
  modalBg: '#2a2a2a',
  modalText: '#e0e0e0',
  modalTextSub: '#888',
  modalBorder: '#3a3a3a',
  placeholder: '#333',
  iconDefault: '#777',
  danger: '#ff6b81',
};

export function useTheme(): ThemeColors {
  const darkMode = useSettingsStore(s => s.darkMode);
  return darkMode ? dark : light;
}
