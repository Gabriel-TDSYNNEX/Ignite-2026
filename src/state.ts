import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { areas, profiles, statuses } from './schema';
import { emptyFilters, productNames, type Filters } from './catalog';

export type View = 'explore' | 'routes' | 'saved';
export type Navigation = Filters & { view: View; article: string; route: string };
export function parseHash(hash: string): Navigation {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const view = params.get('view');
  const pick = (key: string, allowed: readonly string[]) => {
    const value = params.get(key) || '';
    return allowed.includes(value) ? value : '';
  };
  return {
    q: params.get('q') || '', area: pick('area', areas), profile: pick('profile', profiles),
    product: pick('product', productNames), status: pick('status', statuses),
    view: view === 'routes' || view === 'saved' ? view : 'explore',
    article: params.get('article') || '', route: pick('route', profiles),
  };
}
export function useNavigation() {
  const [navigation, setNavigation] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setNavigation(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
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
const key = 'tdsynnex-ignite-2026';
export function usePreferences() {
  const [loaded] = useState((): { data: Preferences; error: string } => {
    try {
      const raw = localStorage.getItem(key);
      return { data: raw ? preferencesSchema.parse(JSON.parse(raw)) : { favorites: [], read: [] }, error: '' };
    } catch (error) {
      console.error('No se pudo leer la selección local', error);
      return { data: { favorites: [], read: [] }, error: 'No se pudo recuperar tu selección local. Los cambios se conservarán solo en esta sesión.' };
    }
  });
  const [preferences, setPreferences] = useState(loaded.data);
  const [storageError, setStorageError] = useState(loaded.error);
  useEffect(() => {
    if (loaded.error) return;
    try { localStorage.setItem(key, JSON.stringify(preferences)); }
    catch (error) {
      console.error('No se pudo guardar la selección local', error);
      setStorageError('El navegador no permite guardar tu selección. Los cambios se conservarán solo en esta sesión.');
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
