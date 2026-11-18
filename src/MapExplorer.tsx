import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ComponentType } from 'react';
import {
  ArrowLeft, ArrowUpRight, Bookmark, Check, ChevronRight, Cloud, Expand, GitBranch, Globe2, Hand,
  Layers3, List, Minus, Monitor, MousePointerClick, Network, Package, Plus, ShieldCheck, Sparkles,
} from 'lucide-react';
import { articles as sourceArticles } from './catalog';
import { areas, type Article, type Area } from './schema';
import { areaLabel, productLabel, statusLabel, text, type Locale } from './i18n';

type IconType = ComponentType<{ size?: number }>;
export const areaIcons: Record<Area, IconType> = {
  Azure: Cloud, 'Microsoft Foundry': Layers3, GitHub: GitBranch, 'Microsoft Copilot': Sparkles,
  'Microsoft Edge': Globe2, 'Microsoft IQ': Network, Security: ShieldCheck, Windows: Monitor,
};
const areaHues: Record<Area, string> = { Azure: '#3b9bff', 'Microsoft Foundry': '#a77bff', GitHub: '#e6edf3', 'Microsoft Copilot': '#ff7ac8', 'Microsoft Edge': '#2ed3b7', 'Microsoft IQ': '#08bed5', Security: '#ccd814', Windows: '#5aa9ff' };

type Step = { kind: 'area' | 'product' | 'article'; id: string };
type MapNode = { key: string; kind: Step['kind']; id: string; label: string; sub: string; icon: IconType; color: string; status?: string; read?: boolean; weight?: number };
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
      : kind === 'product' ? productArticles(id, catalog).length > 0
      : kind === 'article' ? Boolean(articleById(id, catalog)) : false;
    if (!valid) break;
    steps.push({ kind: kind as Step['kind'], id });
  }
  return steps.slice(-4);
}
const serialize = (steps: Step[]) => steps.map(step => `${step.kind}:${step.id}`).join('/');
const stepLabel = (step: Step, locale: Locale, catalog: Article[]) => step.kind === 'area' ? areaLabel(locale, step.id as Area) : step.kind === 'product' ? productLabel(locale, step.id) : articleById(step.id, catalog)?.title ?? step.id;

function productNode(product: string, locale: Locale, catalog: Article[]): MapNode {
  const count = productArticles(product, catalog).length;
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

type Camera = { x: number; y: number; s: number };
const listQuery = '(max-width: 860px)';
const restingCamera: Camera = { x: 0, y: 0, s: 1 };

export function MapExplorer({ path, onPath, onOpenArticle, onShowCatalog, read, favorites, toggleFavorite, markRead, articles, locale }: {
  path: string;
  onPath: (path: string) => void;
  onOpenArticle: (article: Article) => void;
  onShowCatalog: (filter: { area?: string; product?: string }) => void;
  read: string[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  markRead: (id: string) => void;
  articles: Article[];
  locale: Locale;
}) {
  const steps = useMemo(() => parseMapPath(path, articles), [path, articles]);
  const current = steps.at(-1);
  const [listMode, setListMode] = useState(() => window.matchMedia(listQuery).matches);
  useEffect(() => {
    const query = window.matchMedia(listQuery);
    const onChange = () => setListMode(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  const [leaving, setLeaving] = useState<{ x: number; y: number; dir: 'in' | 'out' } | null>(null);
  const [camera, setCamera] = useState(restingCamera);
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
  useLayoutEffect(() => { setCamera(restingCamera); setLeaving(null); }, [path]);
  const centerArticle = current?.kind === 'article' ? articleById(current.id, articles) : undefined;
  useEffect(() => { if (centerArticle) markRead(centerArticle.id); }, [centerArticle, markRead]);

  const nodes: MapNode[] = useMemo(() => {
    if (!current) return areas.map(area => {
      const count = articles.filter(article => article.area === area).length;
      return { key: `area:${area}`, kind: 'area', id: area, label: areaLabel(locale, area), sub: plural(count, text(locale, 'mapAreaOne'), text(locale, 'mapAreaMany')), icon: areaIcons[area], color: areaHues[area], weight: count };
    });
    if (current.kind === 'area') return areaProducts(current.id, articles).map(product => productNode(product, locale, articles));
    if (current.kind === 'product') {
      const parentArea = steps.at(-2)?.kind === 'area' ? steps.at(-2)!.id : undefined;
      return productArticles(current.id, articles)
        .sort((a, b) => Number(b.area === parentArea) - Number(a.area === parentArea))
        .map(article => articleNode(article, read, locale));
    }
    const article = articleById(current.id, articles)!;
    const products: MapNode[] = article.products.map(product => productNode(product, locale, articles));
    const related = articles
      .filter(other => other.id !== article.id)
      .map(other => ({ other, score: other.products.filter(product => article.products.includes(product)).length * 3 + (other.area === article.area ? 1 : 0) + other.profiles.filter(profile => article.profiles.includes(profile)).length * 0.1 }))
      .filter(entry => entry.score >= 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(3, 9 - products.length))
      .map(entry => articleNode(entry.other, read, locale));
    return [...products.slice(0, 6), ...related];
  }, [current, steps, read, articles, locale]);
  const positions = useMemo(() => layout(nodes.length, centerArticle ? 'large' : 'small'), [nodes.length, centerArticle]);

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function go(next: Step[], origin?: { x: number; y: number }) {
    const target = serialize(next);
    if (target === path) return;
    if (reduceMotion() || listMode) { onPath(target); return; }
    setLeaving({ x: origin?.x ?? 50, y: origin?.y ?? 50, dir: next.length > steps.length || origin ? 'in' : 'out' });
    window.setTimeout(() => onPath(target), 360);
  }
  function enter(node: MapNode, index: number) {
    if (suppressClick.current) return;
    const existing = steps.findIndex(step => step.kind === node.kind && step.id === node.id);
    const next = existing >= 0 ? steps.slice(0, existing + 1) : [...steps, { kind: node.kind, id: node.id }];
    go(next.length > 4 ? next.slice(-4) : next, { x: positions[index][0], y: positions[index][1] });
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

  const title = !current ? text(locale, 'mapHome') : stepLabel(current, locale, articles);
  const levelHint = !current ? text(locale, 'mapHintAreas') : current.kind === 'area' ? text(locale, 'mapHintProducts') : current.kind === 'article' ? text(locale, 'mapHintRelated') : text(locale, 'mapHintArticles');
  const centerColor = current?.kind === 'area' ? areaHues[current.id as Area] : current?.kind === 'product' ? '#ccd814' : centerArticle ? areaHues[centerArticle.area] : '#08bed5';
  const CenterIcon = current?.kind === 'area' ? areaIcons[current.id as Area] : current?.kind === 'product' ? Package : Sparkles;
  const levelArticleIds = current?.kind === 'area' ? articles.filter(article => article.area === current.id).map(article => article.id)
    : nodes.filter(node => node.kind === 'article').map(node => node.id);
  const levelRead = levelArticleIds.filter(id => read.includes(id)).length;
  const levelArticles = levelArticleIds.length;

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
        <div key={path} className={`explorer-world ${arrival} ${leaving ? `leave-${leaving.dir}` : ''} ${centerArticle ? 'article-level' : ''} ${nodes.length > 10 ? 'dense' : ''} ${nodes.length > 22 ? 'crowded' : ''}`}
          style={leaving ? { transformOrigin: `${leaving.x}% ${leaving.y}%` } : undefined}>
          {!listMode && <svg className="explorer-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {!current && <><ellipse cx="50" cy="50" rx="34" ry="35" /><ellipse cx="50" cy="50" rx="20" ry="21" /></>}
            {positions.map(([x, y], i) => <path key={nodes[i].key} d={`M50 50 Q${(50 + x) / 2 + (y - 50) * 0.12} ${(50 + y) / 2 - (x - 50) * 0.12} ${x} ${y}`} className={nodes[i].kind} style={{ animationDelay: `${120 + i * 25}ms` }} />)}
          </svg>}

          <div className={`explorer-center ${centerArticle ? 'center-article' : ''}`}>
            {centerArticle ? <>
              <div className="center-meta"><span className="center-area" style={{ color: areaHues[centerArticle.area] }}>{(() => { const Icon = areaIcons[centerArticle.area]; return <Icon size={14} />; })()}{areaLabel(locale, centerArticle.area)}</span><span className={`status ${statusClass(centerArticle.status)}`}>{statusLabel(locale, centerArticle.status)}</span></div>
              <h3>{centerArticle.title}</h3>
              <p>{centerArticle.summary}</p>
              <p className="center-impact"><strong>{text(locale, 'whyMatters')} </strong>{centerArticle.impact}</p>
              <div className="center-actions">
                <button className="button primary" onClick={() => onOpenArticle(centerArticle)}>{text(locale, 'fullArticle')}<ArrowUpRight size={16} /></button>
                <button className={`icon-button ${favorites.includes(centerArticle.id) ? 'is-saved' : ''}`} onClick={() => toggleFavorite(centerArticle.id)} aria-pressed={favorites.includes(centerArticle.id)} aria-label={`${text(locale, favorites.includes(centerArticle.id) ? 'removeSaved' : 'addSaved')} ${text(locale, 'saved')}: ${centerArticle.title}`}><Bookmark size={17} fill={favorites.includes(centerArticle.id) ? 'currentColor' : 'none'} /></button>
              </div>
            </> : <>
              <div className="center-symbol"><CenterIcon size={28} /></div>
              <strong>{title}</strong>
              <span>{!current ? text(locale, 'mapCenterCount', { count: articles.length }) : text(locale, 'mapExploredCount', { read: levelRead, total: levelArticles })}</span>
              {current && <button className="center-link" onClick={() => onShowCatalog(current.kind === 'area' ? { area: current.id } : { product: current.id })}>{text(locale, 'viewCatalog')}<ArrowUpRight size={13} /></button>}
            </>}
          </div>

          {nodes.map((node, i) => {
            const Icon = node.icon;
            const [x, y] = positions[i];
            return <button key={node.key} className={`explorer-node node-${node.kind} ${node.read ? 'is-read' : ''}`}
              style={{ left: `${x}%`, top: `${y}%`, '--node': node.color, animationDelay: `${80 + i * 35}ms`, ...(node.weight ? { '--weight': Math.min(1.25, 0.9 + node.weight / 40) } : {}) } as CSSProperties}
              onClick={() => enter(node, i)}
              aria-label={node.kind === 'area' ? text(locale, 'mapAreaNode', { name: node.label, count: node.sub }) : node.kind === 'product' ? text(locale, 'mapProductNode', { name: node.label, count: node.sub }) : text(locale, 'mapArticleNode', { name: node.label, status: node.sub, read: node.read ? text(locale, 'mapStatusRead') : '' })}>
              <span className="node-glyph"><Icon size={node.kind === 'area' ? 22 : 15} /></span>
              <span className="node-copy"><strong>{node.label}</strong><small>{node.kind === 'article' && node.status ? <span className={`dot ${statusClass(node.status)}`} /> : null}{node.sub}</small></span>
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
