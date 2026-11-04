// Phase 10: your own styles, kept in IndexedDB and added from library files.
import 'fake-indexeddb/auto';
import { styleEffects } from '../project/styles';
import { addUserStyles, loadUserStyles, removeUserStyle, resetUserStyles, saveUserStyle, userStyles } from './styles';

beforeEach(() => resetUserStyles());

it('saves a style, keeps it across a reload, and removes it', async () => {
  const st = await saveUserStyle('  My gold  ', styleEffects('gold'));
  expect(st.name).toBe('My gold');
  resetUserStyles();
  const loaded = await loadUserStyles();
  expect(loaded.map((s) => s.name)).toContain('My gold');
  expect(loaded.find((s) => s.id === st.id)!.effects).toEqual(styleEffects('gold'));
  await removeUserStyle(st.id);
  expect(userStyles.getState().styles.some((s) => s.id === st.id)).toBe(false);
});

it('adds the styles of a library file, newest first', async () => {
  await addUserStyles([{ name: 'From a file', effects: styleEffects('obsidian') }]);
  expect(userStyles.getState().styles[0].name).toBe('From a file');
});
