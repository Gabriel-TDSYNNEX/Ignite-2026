import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import {
  ArrowLeft, ArrowUpRight, BadgeCheck, Bookmark, Bot, Briefcase, Check, ChevronRight, Cloud, Combine, Cpu, Database, Expand,
  GitBranch, Globe2, Hand, LayoutDashboard, Layers3, Lightbulb, List, Minus, Monitor, MousePointerClick, Network,
  Package, Plus, Radar, RefreshCcw, Rocket, Server,   ShieldCheck, Sparkles, TrendingUp, Wrench, X,
} from 'lucide-react';
import { articles as sourceArticles } from './catalog';
import { areas, type Article, type Area, type IdeaIcon } from './schema';
import { allIdeaIds, coIdeas, ideaById, ideas, inIdea, pillars, primaryIdea, statusKeys, statusOrder } from './ideas';
import { areaLabel, productLabel, statusLabel, text, type Locale } from './i18n';

type IconType = ComponentType<{ size?: number }>;
export const areaIcons: Record<Area, IconType> = {
  Azure: Cloud, 'Microsoft Foundry': Layers3, GitHub: GitBranch, 'Microsoft Copilot': Sparkles,
  'Microsoft Edge': Globe2, 'Microsoft IQ': Network, Security: ShieldCheck, Windows: Monitor,
};
export const ideaIcons: Record<IdeaIcon, IconType> = {
  'layout-dashboard': LayoutDashboard, bot: Bot, briefcase: Briefcase, 'trending-up': TrendingUp, rocket: Rocket,
  cpu: Cpu, network: Network, 'refresh-ccw': RefreshCcw, 'badge-check': BadgeCheck, radar: Radar,
  'shield-check': ShieldCheck, database: Database, wrench: Wrench, server: Server, monitor: Monitor,
};
/** Idea accent colour; saturation and lightness come from the active theme. */
export const ideaColor = (hue: number, alpha = 1) => `hsl(${hue} var(--idea-sat) var(--idea-light) / ${alpha})`;
const areaHues: Record<Area, string> = { Azure: '#3b9bff', 'Microsoft Foundry': '#a77bff', GitHub: 'var(--github-ink)', 'Microsoft Copilot': '#ff7ac8', 'Microsoft Edge': '#2ed3b7', 'Microsoft IQ': '#08bed5', Security: '#ccd814', Windows: '#5aa9ff' };

type Step = { kind: 'area' | 'idea' | 'product' | 'article'; id: string };
type MapNode = { key: string; kind: Step['kind']; id: string; label: string; sub: string; icon: IconType; color: string; status?: string; read?: boolean; weight?: number; items?: Article[] };
export type MapState = { map: string; by: string; st: string; cross: string };
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const articleById = (id: string, catalog = sourceArticles) => catalog.find(article => article.id === id);
const productArticles = (product: string, catalog = sourceArticles) => catalog.filter(article => article.products.includes(product));
const statusClass = (status: string) => status === 'GA' ? 'ga' : status === 'Preview' ? 'preview' : 'mixed';

export function parseMapPath(value: string, catalog = sourceArticles): Step[] {
  const steps: Step[] = [];
  for (const part of value.split('/').filter(Boolean)) {
    const separator = part.indexOf(':');
    const kind = part.slice(0, separator);
    const id = part.slice(separator + 1);
    const valid = kind === 'area' ? (areas as readonly string[]).includes(id)
      : kind === 'idea' ? ideaById.has(id)
      : kind === 'product' ? productArticles(id, catalog).length > 0
      : kind === 'article' ? Boolean(articleById(id, catalog)) : false;
    if (!valid) break;
    steps.push({ kind: kind as Step['kind'], id });
  }
  return steps.slice(-4);
}
const serialize = (steps: Step[]) => steps.map(step => `${step.kind}:${step.id}`).join('/');
const stepLabel = (step: Step, locale: Locale, catalog: Article[]) => step.kind === 'area' ? areaLabel(locale, step.id as Area) : step.kind === 'idea' ? ideaById.get(step.id)!.short[locale] : step.kind === 'product' ? productLabel(locale, step.id) : articleById(step.id, catalog)?.title ?? step.id;

function productNode(product: string, locale: Locale, count: number): MapNode {
  return { key: `product:${product}`, kind: 'product', id: product, label: productLabel(locale, product), sub: plural(count, text(locale, 'mapArticleOne'), text(locale, 'mapArticleMany')), icon: Package, color: '#ccd814' };
}

function areaProducts(area: string, catalog: Article[]) {
  const inArea = new Map<string, number>();
  for (const article of catalog) if (article.area === area) for (const product of article.products) inArea.set(product, (inArea.get(product) ?? 0) + 1);
  return [...inArea.keys()].sort((a, b) => (inArea.get(b)! - inArea.get(a)!) || (productArticles(b, catalog).length - productArticles(a, catalog).length) || a.localeCompare(b, 'es'));
}

function articleNode(article: Article, read: string[], locale: Locale): MapNode {
  return { key: `article:${article.id}`, kind: 'article', id: article.id, label: article.title, sub: statusLabel(locale, article.status), icon: areaIcons[article.area], color: areaHues[article.area], status: article.status, read: read.includes(article.id) };
}

function layout(count: number, center: 'small' | 'large') {
  if (center === 'large') {
    return Array.from({ length: count }, (_, i) => {
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2 + (count % 2 ? 0 : Math.PI / count);
      return [50 + Math.cos(angle) * 40, 50 + Math.sin(angle) * 38];
    });
  }
  if (count > 10) {
    // Dense levels: pick the slots of a grid that are closest to the core, then order them clockwise.
    const slots: number[][] = [];
    if (count > 22) {
      // Very dense levels use a staggered grid so neighbouring rows never stack on top of each other.
      [7, 21, 35, 50, 65, 79, 93].forEach((y, row) => {
        const columns = row % 2 ? [17.2, 33.6, 50, 66.4, 82.8] : [9, 25.4, 41.8, 58.2, 74.6, 91];
        for (const x of columns) if (!(Math.abs(y - 50) <= 15 && Math.abs(x - 50) < 17)) slots.push([x, y]);
      });
    } else {
      for (const x of [11, 30.5, 50, 69.5, 89]) for (const y of [11, 30.5, 50, 69.5, 89]) {
        if (x === 50 && y > 20 && y < 80) continue;
        slots.push([x, y]);
      }
    }
    const distance = ([x, y]: number[]) => Math.hypot((x - 50) * 1.9, y - 50);
    const angle = ([x, y]: number[]) => (Math.atan2(y - 50, (x - 50) * 1.9) + Math.PI * 2.5) % (Math.PI * 2);
    return slots.sort((a, b) => distance(a) - distance(b)).slice(0, count).sort((a, b) => angle(a) - angle(b));
  }
  const ring = (n: number, rx: number, ry: number) => Array.from({ length: n }, (_, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [50 + Math.cos(angle) * rx, 50 + Math.sin(angle) * ry];
  });
  return ring(count, count > 6 ? 34 : 30, count > 6 ? 35 : 32);
}

/** Ideas dial: every pillar owns a quadrant (clockwise from top-left) and its ideas alternate between an outer and an inner orbit. */
const dial = pillars.flatMap((pillar, p) => {
  const members = ideas.filter(idea => idea.pillar === pillar.id);
  return members.map((idea, i) => {
    const angle = Math.PI * (1 + p / 2) + (0.14 + ((i + 0.5) / members.length) * 0.72) * Math.PI / 2;
    const [rx, ry] = i % 2 ? [26, 25] : [40, 37];
    return { id: idea.id, x: 50 + Math.cos(angle) * rx, y: 50 + Math.sin(angle) * ry };
  });
});
const dialPosition = new Map(dial.map(spot => [spot.id, [spot.x, spot.y]]));

function Availability({ items }: { items: Article[] }) {
  if (!items.length) return null;
  return <span className="status-bar node-bar" aria-hidden="true">{statusOrder.map(status => {
    const count = items.filter(article => article.status === status).length;
    return count ? <span key={status} className={`seg st-${statusKeys[status]}`} style={{ flex: count }} /> : null;
  })}</span>;
}

type CrossOption = { id: string; label: string; count: number; color: string; icon: IconType };
type Camera = { x: number; y: number; s: number };
const listQuery = '(max-width: 860px)';
const restingCamera: Camera = { x: 0, y: 0, s: 1 };

export function MapExplorer({ state, onChange, onOpenArticle, onShowCatalog, read, favorites, toggleFavorite, markRead, articles, locale }: {
  state: MapState;
  onChange: (patch: Partial<MapState>) => void;
  onOpenArticle: (article: Article) => void;
  onShowCatalog: (filter: { area?: string; product?: string }) => void;
  read: string[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  markRead: (id: string) => void;
  articles: Article[];
  locale: Locale;
}) {
  const path = state.map;
  const byIdea = state.by === 'idea';
  const statusFilter = useMemo(() => statusOrder.filter(status => state.st.split(',').includes(status)), [state.st]);
  const pool = useMemo(() => statusFilter.length ? articles.filter(article => statusFilter.includes(article.status)) : articles, [articles, statusFilter]);
  const steps = useMemo(() => parseMapPath(path, articles), [path, articles]);
  const current = steps.at(-1);
  const rootIdeas = !current && byIdea;
  const [listMode, setListMode] = useState(() => window.matchMedia(listQuery).matches);
  useEffect(() => {
    const query = window.matchMedia(listQuery);
    const onChange = () => setListMode(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const [leaving, setLeaving] = useState<{ x: number; y: number; dir: 'in' | 'out' } | null>(null);
  const [camera, setCamera] = useState(restingCamera);
  const [hover, setHover] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const motion = useRef({ path, depth: steps.length, arrival: 'arrive-in' });
  if (motion.current.path !== path) {
    motion.current = { path, depth: steps.length, arrival: steps.length >= motion.current.depth ? 'arrive-in' : 'arrive-out' };
  }
  const arrival = motion.current.arrival;
  useLayoutEffect(() => { setCamera(restingCamera); setLeaving(null); setHover(''); }, [path, state.by]);
  const centerArticle = current?.kind === 'article' ? articleById(current.id, articles) : undefined;
  useEffect(() => { if (centerArticle) markRead(centerArticle.id); }, [centerArticle, markRead]);

  // Cross lens: intersect the current level with ideas (area/product levels) or with areas (idea level).
  const scope = useMemo(() => !current || current.kind === 'article' ? []
    : current.kind === 'area' ? pool.filter(article => article.area === current.id)
    : current.kind === 'idea' ? pool.filter(article => inIdea(article, current.id, true))
    : productArticles(current.id, pool), [current, pool]);
  const crossKind = !current || current.kind === 'article' ? null : current.kind === 'idea' ? 'area' : 'idea';
  const crossOptions: CrossOption[] = useMemo(() => {
    if (crossKind === 'area') return areas.map(area => ({ id: area, label: areaLabel(locale, area), count: scope.filter(article => article.area === area).length, color: areaHues[area], icon: areaIcons[area] }))
      .filter(option => option.count).sort((a, b) => b.count - a.count);
    if (crossKind === 'idea') return ideas.map(idea => ({ id: idea.id, label: idea.short[locale], count: scope.filter(article => inIdea(article, idea.id, true)).length, color: ideaColor(idea.hue), icon: ideaIcons[idea.icon] }))
      .filter(option => option.count).sort((a, b) => b.count - a.count);
    return [];
  }, [crossKind, scope, locale]);
  const cross = crossOptions.some(option => option.id === state.cross) ? state.cross : '';
  const scoped = useMemo(() => !cross ? scope : scope.filter(article => crossKind === 'area' ? article.area === cross : inIdea(article, cross, true)), [scope, cross, crossKind]);

  const nodes: MapNode[] = useMemo(() => {
    if (!current && byIdea) return dial.map(({ id }) => {
      const idea = ideaById.get(id)!;
      const items = pool.filter(article => inIdea(article, id, true));
      return { key: `idea:${id}`, kind: 'idea', id, label: idea.short[locale], sub: plural(items.length, text(locale, 'mapAreaOne'), text(locale, 'mapAreaMany')), icon: ideaIcons[idea.icon], color: ideaColor(idea.hue), items };
    });
    if (!current) return areas.map(area => {
      const items = pool.filter(article => article.area === area);
      return { key: `area:${area}`, kind: 'area', id: area, label: areaLabel(locale, area), sub: plural(items.length, text(locale, 'mapAreaOne'), text(locale, 'mapAreaMany')), icon: areaIcons[area], color: areaHues[area], weight: items.length, items };
    });
    if (current.kind === 'area') return areaProducts(current.id, scoped).map(product => productNode(product, locale, productArticles(product, cross ? scoped : pool).length));
    if (current.kind === 'idea') return [...scoped]
      .sort((a, b) => Number(primaryIdea(b).id === current.id) - Number(primaryIdea(a).id === current.id) || statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
      .map(article => articleNode(article, read, locale));
    if (current.kind === 'product') {
      const parentArea = steps.at(-2)?.kind === 'area' ? steps.at(-2)!.id : undefined;
      return [...scoped]
        .sort((a, b) => Number(b.area === parentArea) - Number(a.area === parentArea))
        .map(article => articleNode(article, read, locale));
    }
    const article = articleById(current.id, articles)!;
    const products: MapNode[] = article.products.map(product => productNode(product, locale, productArticles(product, pool).length));
    const related = pool
      .filter(other => other.id !== article.id)
      .map(other => ({ other, score: other.products.filter(product => article.products.includes(product)).length * 3 + (other.area === article.area ? 1 : 0) + other.profiles.filter(profile => article.profiles.includes(profile)).length * 0.1 }))
      .filter(entry => entry.score >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(3, 9 - products.length))
      .map(entry => articleNode(entry.other, read, locale));
    return [...products.slice(0, 6), ...related];
  }, [current, steps, read, articles, pool, scoped, cross, byIdea, locale]);
  const positions = useMemo(() => rootIdeas ? dial.map(spot => [spot.x, spot.y]) : layout(nodes.length, centerArticle ? 'large' : 'small'), [rootIdeas, nodes.length, centerArticle]);
  const links = useMemo(() => rootIdeas && hover ? coIdeas(hover, pool) : [], [rootIdeas, hover, pool]);
  const linked = new Map(links);
  const strongest = Math.max(1, ...links.map(([, weight]) => weight));
  const hovered = hover ? ideaById.get(hover) : undefined;

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(next: Step[], origin?: { x: number; y: number }, extra: Partial<MapState> = {}) {
    const target = serialize(next);
    if (target === path && !Object.keys(extra).length) return;
    const patch = { map: target, cross: '', ...extra };
    if (reduceMotion() || listMode) { onChange(patch); return; }
    setLeaving({ x: origin?.x ?? 50, y: origin?.y ?? 50, dir: next.length > steps.length || origin ? 'in' : 'out' });
    window.setTimeout(() => onChange(patch), 360);
  }
  function enter(node: MapNode, index: number) {
    if (suppressClick.current) return;
    const existing = steps.findIndex(step => step.kind === node.kind && step.id === node.id);
    const next = existing >= 0 ? steps.slice(0, existing + 1) : [...steps, { kind: node.kind, id: node.id }];
    go(next.length > 4 ? next.slice(-4) : next, { x: positions[index][0], y: positions[index][1] });
  }
  function toggleStatus(status: string) {
    const next = statusFilter.includes(status as Article['status']) ? statusFilter.filter(item => item !== status) : [...statusFilter, status];
    onChange({ st: statusOrder.filter(item => next.includes(item)).join(',') });
  }

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      if (listMode || !element) return;
      const cam = cameraRef.current;
      const next = Math.min(2.6, Math.max(0.7, cam.s * Math.exp(-event.deltaY * 0.0016)));
      // At the zoom limits the wheel scrolls the page instead of trapping it.
      if (next === cam.s) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left, py = event.clientY - rect.top;
      const updated = { s: next, x: px - (px - cam.x) * (next / cam.s), y: py - (py - cam.y) * (next / cam.s) };
      cameraRef.current = updated;
      setCamera(updated);
    }
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [listMode]);
  function zoomBy(factor: number) {
    const rect = viewport.current?.getBoundingClientRect();
    if (!rect) return;
    setCamera(cam => {
      const next = Math.min(2.6, Math.max(0.7, cam.s * factor));
      const px = rect.width / 2, py = rect.height / 2;
      return { s: next, x: px - (px - cam.x) * (next / cam.s), y: py - (py - cam.y) * (next / cam.s) };
    });
  }

  const currentIdea = current?.kind === 'idea' ? ideaById.get(current.id) : undefined;
  const title = rootIdeas ? hovered?.name[locale] ?? text(locale, 'mapByIdea') : !current ? text(locale, 'mapHome') : currentIdea ? currentIdea.name[locale] : stepLabel(current, locale, articles);
  const levelHint = rootIdeas ? text(locale, 'mapHintIdeas') : !current ? text(locale, 'mapHintAreas') : current.kind === 'area' ? text(locale, 'mapHintProducts') : current.kind === 'idea' ? text(locale, 'mapHintIdea') : current.kind === 'article' ? text(locale, 'mapHintRelated') : text(locale, 'mapHintArticles');
  const focusIdea = currentIdea ?? hovered;
  const centerColor = focusIdea ? ideaColor(focusIdea.hue) : current?.kind === 'area' ? areaHues[current.id as Area] : current?.kind === 'product' ? '#ccd814' : centerArticle ? areaHues[centerArticle.area] : '#08bed5';
  const CenterIcon = focusIdea ? ideaIcons[focusIdea.icon] : rootIdeas ? Lightbulb : current?.kind === 'area' ? areaIcons[current.id as Area] : current?.kind === 'product' ? Package : Sparkles;
  const levelArticleIds = current?.kind === 'area' ? scoped.map(article => article.id)
    : nodes.filter(node => node.kind === 'article').map(node => node.id);
  const levelRead = levelArticleIds.filter(id => read.includes(id)).length;
  const levelArticles = levelArticleIds.length;
  const availableStatuses = statusOrder.filter(status => articles.some(article => article.status === status));
  const centerCount = !nodes.length ? text(locale, 'mapNoResults')
    : rootIdeas ? hovered ? text(locale, 'mapShared', { count: links.length }) : text(locale, 'mapIdeasCenter', { count: pool.length, ideas: ideas.length, pillars: pillars.length })
    : !current ? text(locale, 'mapCenterCount', { count: pool.length }) : text(locale, 'mapExploredCount', { read: levelRead, total: levelArticles });
  const ideaChip = (id: string, primary: boolean) => {
    const idea = ideaById.get(id)!;
    const Icon = ideaIcons[idea.icon];
    return <button key={id} type="button" className={`idea-chip ${primary ? 'primary' : ''}`} style={{ '--idea': ideaColor(idea.hue), '--idea-soft': ideaColor(idea.hue, 0.14) } as CSSProperties}
      onClick={() => go([{ kind: 'idea', id }], undefined, { by: 'idea' })}><Icon size={13} aria-hidden="true" />{idea.short[locale]}</button>;
  };

  return <section className={`explorer ${listMode ? 'is-list' : ''}`} aria-label={text(locale, 'skipMapLabel')} style={{ '--focus': centerColor } as CSSProperties}>
    <div className="explorer-bar">
      <nav className="crumbs" aria-label={text(locale, 'mapBreadcrumb')}>
        {steps.length > 0 && <button className="crumb-back" onClick={() => go(steps.slice(0, -1))} aria-label={text(locale, 'mapBack')}><ArrowLeft size={16} /></button>}
        <ol>
          <li><button onClick={() => go([])} aria-current={!current ? 'location' : undefined}><Sparkles size={13} />{text(locale, 'mapHome')}</button></li>
          {steps.map((step, index) => <li key={`${step.kind}:${step.id}`}><ChevronRight size={13} aria-hidden="true" />
            <button onClick={() => go(steps.slice(0, index + 1))} aria-current={index === steps.length - 1 ? 'location' : undefined}>{stepLabel(step, locale, articles)}</button></li>)}
        </ol>
      </nav>
      <div className="explorer-tools">
        {!listMode && <div className="zoom-controls" aria-label={text(locale, 'mapZoom')}>
          <button onClick={() => zoomBy(1.25)} aria-label={text(locale, 'zoomIn')}><Plus size={15} /></button>
          <button onClick={() => zoomBy(0.8)} aria-label={text(locale, 'zoomOut')}><Minus size={15} /></button>
          <button onClick={() => setCamera(restingCamera)} aria-label={text(locale, 'centerMap')}><Expand size={14} /></button>
        </div>}
        <div className="segmented" aria-label={text(locale, 'viewType')}>
          <button aria-label={text(locale, 'mapView')} aria-pressed={!listMode} onClick={() => setListMode(false)}><Network size={16} /></button>
          <button aria-label={text(locale, 'listView')} aria-pressed={listMode} onClick={() => setListMode(true)}><List size={16} /></button>
        </div>
      </div>
    </div>

    <div className="explorer-lens">
      <div className="lens-group" role="group" aria-label={text(locale, 'mapByLabel')}>
        <span className="lens-label">{text(locale, 'mapByLabel')}</span>
        <div className="segmented by-toggle">
          <button aria-pressed={!byIdea} onClick={() => byIdea && go([], undefined, { by: '' })}><Layers3 size={14} />{text(locale, 'mapByArea')}</button>
          <button aria-pressed={byIdea} onClick={() => !byIdea && go([], undefined, { by: 'idea' })}><Lightbulb size={14} />{text(locale, 'mapByIdea')}</button>
        </div>
      </div>
      <div className="lens-group lens-status" role="group" aria-label={text(locale, 'mapAvailability')}>
        <span className="lens-label">{text(locale, 'mapAvailability')}</span>
        <div className="lens-chips">
          {availableStatuses.map(status => <button key={status} className={`filter-chip st-${statusKeys[status]}`} aria-pressed={statusFilter.includes(status)} onClick={() => toggleStatus(status)}>
            <span className="chip-dot" aria-hidden="true" />{statusLabel(locale, status)}<span className="chip-count">{articles.filter(article => article.status === status).length}</span></button>)}
          {statusFilter.length > 0 && <button className="text-button lens-clear" onClick={() => onChange({ st: '' })}><X size={13} />{text(locale, 'clearFilters')}</button>}
        </div>
      </div>
    </div>
    {crossKind && crossOptions.length > 1 && <div className="explorer-cross" role="group" aria-label={text(locale, crossKind === 'idea' ? 'mapCrossIdeas' : 'mapCrossAreas')}>
      <span className="lens-label"><Combine size={14} aria-hidden="true" />{text(locale, crossKind === 'idea' ? 'mapCrossIdeas' : 'mapCrossAreas')}</span>
      <div className="lens-chips">
        <button className="filter-chip" aria-pressed={!cross} onClick={() => onChange({ cross: '' })}>{text(locale, 'mapCrossAll')}<span className="chip-count">{scope.length}</span></button>
        {crossOptions.map(option => {
          const Icon = option.icon;
          return <button key={option.id} className="idea-chip cross-chip" aria-pressed={cross === option.id} style={{ '--idea': option.color } as CSSProperties}
            onClick={() => onChange({ cross: cross === option.id ? '' : option.id })}><Icon size={13} aria-hidden="true" />{option.label}<span className="chip-count">{option.count}</span></button>;
        })}
      </div>
    </div>}

    <div ref={viewport} className="explorer-viewport"
      onPointerDown={event => {
        if (listMode || event.pointerType === 'touch' || event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y, moved: false, id: event.pointerId };
        suppressClick.current = false;
      }}
      onPointerMove={event => {
        const d = drag.current;
        if (!d) return;
        const dx = event.clientX - d.x, dy = event.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 5) return;
        if (!d.moved) { d.moved = true; viewport.current?.setPointerCapture(d.id); }
        setCamera(cam => ({ ...cam, x: d.cx + dx, y: d.cy + dy }));
      }}
      onPointerUp={() => { suppressClick.current = Boolean(drag.current?.moved); drag.current = null; window.setTimeout(() => { suppressClick.current = false; }, 0); }}
      onPointerCancel={() => { drag.current = null; }}>
      <div className="explorer-grid" aria-hidden="true" style={{ backgroundPosition: `${camera.x}px ${camera.y}px`, backgroundSize: `${28 * camera.s}px ${28 * camera.s}px` }} />
      <div className="explorer-camera" style={{ transform: listMode ? undefined : `translate(${camera.x}px, ${camera.y}px) scale(${camera.s})` }}>
        <div key={`${state.by}|${path}`} className={`explorer-world ${arrival} ${leaving ? `leave-${leaving.dir}` : ''} ${centerArticle ? 'article-level' : ''} ${rootIdeas ? 'idea-dial' : ''} ${hover ? 'has-hover' : ''} ${nodes.length > 10 && !rootIdeas ? 'dense' : ''} ${nodes.length > 22 ? 'crowded' : ''}`}
          style={leaving ? { transformOrigin: `${leaving.x}% ${leaving.y}%` } : undefined}>
          {!listMode && <svg className="explorer-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {!current && <><ellipse cx="50" cy="50" rx={rootIdeas ? 40 : 34} ry={rootIdeas ? 37 : 35} /><ellipse cx="50" cy="50" rx={rootIdeas ? 26 : 20} ry={rootIdeas ? 25 : 21} /></>}
            {rootIdeas ? <>
              <line className="dial-axis" x1="50" y1="3" x2="50" y2="97" /><line className="dial-axis" x1="2" y1="50" x2="98" y2="50" />
              {hovered && links.map(([id, weight]) => {
                const [x1, y1] = dialPosition.get(hover)!, [x2, y2] = dialPosition.get(id)!;
                return <path key={id} className="idea-link" d={`M${x1} ${y1} Q${(x1 + x2) / 4 + 25} ${(y1 + y2) / 4 + 25} ${x2} ${y2}`} style={{ stroke: ideaColor(hovered.hue, 0.75), strokeWidth: `${1 + 4.5 * weight / strongest}px` }} />;
              })}
            </> : positions.map(([x, y], i) => <path key={nodes[i].key} d={`M50 50 Q${(50 + x) / 2 + (y - 50) * 0.12} ${(50 + y) / 2 - (x - 50) * 0.12} ${x} ${y}`} className={nodes[i].kind} style={{ animationDelay: `${120 + i * 25}ms` }} />)}
          </svg>}
          {rootIdeas && !listMode && pillars.map((pillar, p) => <span key={pillar.id} className={`dial-pillar q${p}`} aria-hidden="true">{pillar.name[locale]}</span>)}

          <div className={`explorer-center ${centerArticle ? 'center-article' : ''}`}>
            {centerArticle ? <>
              <div className="center-meta"><span className="center-area" style={{ color: areaHues[centerArticle.area] }}>{(() => { const Icon = areaIcons[centerArticle.area]; return <Icon size={14} />; })()}{areaLabel(locale, centerArticle.area)}</span><span className={`status ${statusClass(centerArticle.status)}`}>{statusLabel(locale, centerArticle.status)}</span></div>
              <h3>{centerArticle.title}</h3>
              <p>{centerArticle.summary}</p>
              <p className="center-impact"><strong>{text(locale, 'whyMatters')} </strong>{centerArticle.impact}</p>
              <div className="chip-row center-ideas">{allIdeaIds(centerArticle).slice(0, 3).map((id, index) => ideaChip(id, index === 0))}</div>
              <div className="center-actions">
                <button className="button primary" onClick={() => onOpenArticle(centerArticle)}>{text(locale, 'fullArticle')}<ArrowUpRight size={16} /></button>
                <button className={`icon-button ${favorites.includes(centerArticle.id) ? 'is-saved' : ''}`} onClick={() => toggleFavorite(centerArticle.id)} aria-pressed={favorites.includes(centerArticle.id)} aria-label={`${text(locale, favorites.includes(centerArticle.id) ? 'removeSaved' : 'addSaved')} ${text(locale, 'saved')}: ${centerArticle.title}`}><Bookmark size={17} fill={favorites.includes(centerArticle.id) ? 'currentColor' : 'none'} /></button>
              </div>
            </> : <>
              <div className="center-symbol"><CenterIcon size={28} /></div>
              <strong>{title}</strong>
              {focusIdea && <p className="center-tagline">{focusIdea.tagline[locale]}</p>}
              {currentIdea && <Availability items={scoped} />}
              <span>{centerCount}</span>
              {(current?.kind === 'area' || current?.kind === 'product') && <button className="center-link" onClick={() => onShowCatalog(current.kind === 'area' ? { area: current.id } : { product: current.id })}>{text(locale, 'viewCatalog')}<ArrowUpRight size={13} /></button>}
            </>}
          </div>

          {nodes.map((node, i) => {
            const Icon = node.icon;
            const [x, y] = positions[i];
            const shared = linked.get(node.id);
            const relation = !rootIdeas || !hover ? '' : node.id === hover ? 'is-hover' : shared ? 'is-linked' : 'is-dim';
            return <button key={node.key} className={`explorer-node node-${node.kind} ${node.read ? 'is-read' : ''} ${node.items && !node.items.length ? 'is-empty' : ''} ${relation}`}
              style={{ left: `${x}%`, top: `${y}%`, '--node': node.color, animationDelay: `${80 + i * 35}ms`, ...(node.weight ? { '--weight': Math.min(1.25, 0.9 + node.weight / 40) } : {}) } as CSSProperties}
              onClick={() => enter(node, i)}
              onPointerEnter={rootIdeas ? () => setHover(node.id) : undefined} onPointerLeave={rootIdeas ? () => setHover('') : undefined}
              onFocus={rootIdeas ? () => setHover(node.id) : undefined} onBlur={rootIdeas ? () => setHover('') : undefined}
              aria-label={node.kind === 'area' ? text(locale, 'mapAreaNode', { name: node.label, count: node.sub }) : node.kind === 'idea' ? text(locale, 'mapIdeaNode', { name: node.label, count: node.sub }) : node.kind === 'product' ? text(locale, 'mapProductNode', { name: node.label, count: node.sub }) : text(locale, 'mapArticleNode', { name: node.label, status: node.sub, read: node.read ? text(locale, 'mapStatusRead') : '' })}>
              <span className="node-glyph"><Icon size={node.kind === 'area' ? 22 : node.kind === 'idea' ? 18 : 15} /></span>
              <span className="node-copy"><strong>{node.label}</strong><small>{node.kind === 'article' && node.status ? <span className={`dot ${statusClass(node.status)}`} /> : null}{node.sub}</small>{node.items && <Availability items={node.items} />}</span>
              {shared ? <span className="node-shared" aria-hidden="true">{shared}</span> : null}
              {node.read && <Check className="node-check" size={13} aria-hidden="true" />}
            </button>;
          })}
        </div>
      </div>
      {!listMode && <div className="explorer-hint" aria-hidden="true"><span><MousePointerClick size={14} />{levelHint}</span><span><Hand size={14} />{text(locale, 'mapDragZoom')}</span></div>}
      {current?.kind === 'article' && !listMode && <div className="explorer-legend" aria-hidden="true"><span><i className="legend-product" />{text(locale, 'mapLegendProduct')}</span><span><i className="legend-article" />{text(locale, 'mapLegendArticle')}</span></div>}
    </div>
  </section>;
}
