import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { areas, profiles, statuses } from './schema';
import { emptyFilters, productNames, type Filters } from './catalog';

export type View = 'explore' | 'ideas' | 'routes' | 'saved';
export const lenses = ['ideas', 'constellation', 'matrix', 'products', 'status', 'all'] as const;
export type Lens = typeof lenses[number];
/** Ideas explorer state: lens '' = ideas, st/au = comma lists, conn '0' = connections off. */
export type IdeaState = { lens: string; idea: string; cell: string; st: string; au: string; conn: string };
export const emptyIdeaState: IdeaState = { lens: '', idea: '', cell: '', st: '', au: '', conn: '' };
export type Navigation = Filters & IdeaState & { view: View; article: string; route: string; map: string };
export const splitList = (value: string) => value ? value.split(',') : [];
export function parseHash(hash: string): Navigation {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const view = params.get('view');
  const pick = (key: string, allowed: readonly string[]) => {
    const value = params.get(key) || '';
    return allowed.includes(value) ? value : '';
  };
  const pickList = (key: string, allowed: readonly string[]) => allowed.filter(value => splitList(params.get(key) || '').includes(value)).join(',');
  return {
    q: params.get('q') || '', area: pick('area', areas), profile: pick('profile', profiles),
    product: pick('product', productNames), status: pick('status', statuses),
    view: view === 'routes' || view === 'saved' || view === 'ideas' ? view : 'explore',
    article: params.get('article') || '', route: pick('route', profiles), map: params.get('map') || '',
    lens: pick('lens', lenses.slice(1)), idea: params.get('idea') || '', cell: params.get('cell') || '',
    st: pickList('st', statuses), au: pickList('au', profiles), conn: params.get('conn') === '0' ? '0' : '',
  };
}
export function useNavigation() {
  const [navigation, setNavigation] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setNavigation(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onHash);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onHash); };
  }, []);
  function navigate(changes: Partial<Navigation>, replace = false) {
    const next = { ...navigation, ...changes };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value && !(key === 'view' && value === 'explore')) params.set(key, value); });
    const url = `${window.location.pathname}${window.location.search}${params.size ? `#${params}` : ''}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setNavigation(next);
  }
  return { navigation, navigate, reset: () => navigate(emptyFilters) };
}
const preferencesSchema = z.object({
  favorites: z.array(z.string()).max(1000),
  read: z.array(z.string()).max(1000),
});
type Preferences = z.infer<typeof preferencesSchema>;
export type StorageError = '' | 'read' | 'write';
const key = 'tdsynnex-ignite-2026';
export function usePreferences() {
  const [loaded] = useState((): { data: Preferences; error: StorageError } => {
    try {
      const raw = localStorage.getItem(key);
      return { data: raw ? preferencesSchema.parse(JSON.parse(raw)) : { favorites: [], read: [] }, error: '' };
    } catch (error) {
      console.error('No se pudo leer la selección local', error);
      return { data: { favorites: [], read: [] }, error: 'read' };
    }
  });
  const [preferences, setPreferences] = useState(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  useEffect(() => {
    if (loaded.error) return;
    try { localStorage.setItem(key, JSON.stringify(preferences)); }
    catch (error) {
      console.error('No se pudo guardar la selección local', error);
      setStorageError('write');
    }
  }, [preferences, loaded.error]);
  function toggleFavorite(id: string) {
    setPreferences(previous => ({ ...previous, favorites: previous.favorites.includes(id) ? previous.favorites.filter(item => item !== id) : [...previous.favorites, id] }));
  }
  const markRead = useCallback((id: string) => {
    setPreferences(previous => previous.read.includes(id) ? previous : { ...previous, read: [...previous.read, id] });
  }, []);
  return { preferences, storageError, toggleFavorite, markRead, clear: () => setPreferences(previous => ({ ...previous, favorites: [] })) };
}

export const themes = ['auto', 'dark', 'light'] as const;
export type Theme = typeof themes[number];
const themeKey = 'tdsynnex-ignite-2026:theme';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(themeKey);
      return themes.includes(saved as Theme) ? saved as Theme : 'auto';
    } catch (error) {
      console.error('No se pudo leer el tema guardado', error);
      return 'auto';
    }
  });
  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(themeKey, theme); }
    catch (error) { console.error('No se pudo guardar el tema', error); }
  }, [theme]);
  return { theme, cycleTheme: () => setTheme(current => themes[(themes.indexOf(current) + 1) % themes.length]) };
}
