// The short message shown at the bottom of the editor ("Opened…", "Pasted 2
// layers.", or what went wrong), from anywhere in the editor.

import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface Message {
  text: string;
  error: boolean;
}

export const messages = createStore<{ current: Message | null }>(() => ({ current: null }));

export const showMessage = (text: string, error = false) => messages.setState({ current: { text, error } });
export const clearMessage = () => messages.setState({ current: null });
export const useMessage = () => useStore(messages, (s) => s.current);
