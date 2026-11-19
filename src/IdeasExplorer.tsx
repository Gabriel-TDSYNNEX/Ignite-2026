import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowUpRight, BadgeCheck, Bot, Briefcase, Cpu, Database, Download, LayoutDashboard, Monitor,
  Network, Radar, RefreshCcw, Rocket, Search, Server, ShieldCheck, TrendingUp, Wrench, X, type LucideIcon,
} from 'lucide-react';
import { emptyFilters, filterArticles, normalize } from './catalog';
import { areas, profiles, type Article, type Idea, type IdeaIcon } from './schema';
import { areaIcons } from './MapExplorer';
import {
  allIdeaIds, byIdeaOrder, clusterRadius, coIdeas, connectedIdeas, constellationLayout, ideaById, ideaEdges, ideas,
  inIdea, pillars, primaryIdea, statusKeys, statusOrder, topProducts,
} from './ideas';
import { emptyIdeaState, splitList, type Lens, type Navigation } from './state';
import { areaLabel, productLabel, profileLabel, statusLabel, text, type Locale } from './i18n';

export const ideaIcons: Record<IdeaIcon, LucideIcon> = {
  'layout-dashboard': LayoutDashboard, bot: Bot, briefcase: Briefcase, 'trending-up': TrendingUp, rocket: Rocket,
  cpu: Cpu, network: Network, 'refresh-ccw': RefreshCcw, 'badge-check': BadgeCheck, radar: Radar,
  'shield-check': ShieldCheck, database: Database, wrench: Wrench, server: Server, monitor: Monitor,
};
/** Idea accent colour; saturation and lightness come from the active theme. */
export const ideaColor = (hue: number, alpha = 1) => `hsl(${hue} var(--idea-sat) var(--idea-light) / ${alpha})`;
const ideaStyle = (idea: Idea) => ({ '--idea': ideaColor(idea.hue), '--idea-soft': ideaColor(idea.hue, 0.14) }) as CSSProperties;

type Translate = (key: Parameters<typeof text>[1], values?: Record<string, string | number>) => string;
type Props = {
  articles: Article[];
  locale: Locale;
  nav: Navigation;
  navigate: (changes: Partial<Navigation>, replace?: boolean) => void;
  openArticle: (article: Article) => void;
  renderCard: (article: Article) => ReactNode;
  searchable: (article: Article) => string[];
};

function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { from.current = target; setValue(target); return; }
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / 650);
      const current = Math.round(start + (target - start) * (1 - (1 - progress) ** 3));
      from.current = current;
      setValue(current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

function Kpi({ value, label, accent }: { value: number; label: string; accent?: string }) {
  const shown = useCountUp(value);
  return <div className={`ideas-kpi ${accent ?? ''}`}><strong>{shown}</strong><span>{label}</span></div>;
}

function Highlight({ value, query }: { value: string; query: string }) {
  const terms = normalize(query).trim().split(/\s+/).filter(term => term.length > 1);
  if (!terms.length) return <>{value}</>;
  const folded = normalize(value);
  const marks = new Array<boolean>(value.length).fill(false);
  for (const term of terms) {
    let index = folded.indexOf(term);
    while (index >= 0) { marks.fill(true, index, index + term.length); index = folded.indexOf(term, index + term.length); }
  }
  // normalize() keeps one character per source character for precomposed text, so indexes line up.
  if (folded.length !== value.length) return <>{value}</>;
  const parts: ReactNode[] = [];
  let start = 0;
  for (let i = 1; i <= value.length; i++) {
    if (i === value.length || marks[i] !== marks[start]) {
      const chunk = value.slice(start, i);
      parts.push(marks[start] ? <mark key={start}>{chunk}</mark> : chunk);
      start = i;
    }
  }
  return <>{parts}</>;
}

function StatusBar({ items, locale }: { items: Article[]; locale: Locale }) {
  if (!items.length) return <div className="status-bar empty" />;
  return <div className="status-bar" role="img" aria-label={statusOrder.map(status => [status, items.filter(article => article.status === status).length] as const).filter(([, count]) => count).map(([status, count]) => `${statusLabel(locale, status)}: ${count}`).join(', ')}>
    {statusOrder.map(status => {
      const count = items.filter(article => article.status === status).length;
      return count ? <span key={status} className={`seg st-${statusKeys[status]}`} style={{ flexGrow: count }} title={`${statusLabel(locale, status)}: ${count}`} /> : null;
    })}
  </div>;
}

function IdeaChip({ idea, locale, onClick, suffix, primary }: { idea: Idea; locale: Locale; onClick: () => void; suffix?: ReactNode; primary?: boolean }) {
  const Icon = ideaIcons[idea.icon];
  return <button type="button" className={`idea-chip ${primary ? 'primary' : ''}`} style={ideaStyle(idea)} onClick={onClick}>
    <Icon size={14} aria-hidden="true" />{idea.short[locale]}{suffix}
  </button>;
}

function ArticleRow({ article, locale, query, onOpen }: { article: Article; locale: Locale; query: string; onOpen: () => void }) {
  const idea = primaryIdea(article);
  return <li className="idea-row">
    <button type="button" onClick={onOpen}>
      <span className="idea-dot" style={ideaStyle(idea)} title={idea.short[locale]} />
      <span className="idea-row-title"><Highlight value={article.title} query={query} /></span>
      <span className={`status-pill st-${statusKeys[article.status]}`}>{statusLabel(locale, article.status)}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </button>
  </li>;
}

export function IdeasExplorer({ articles, locale, nav, navigate, openArticle, renderCard, searchable }: Props) {
  const tr: Translate = (key, values = {}) => text(locale, key, values);
  const lens: Lens = (nav.lens || 'ideas') as Lens;
  const connections = nav.conn !== '0';
  const st = splitList(nav.st);
  const au = splitList(nav.au);
  const openIdea = nav.idea ? ideaById.get(nav.idea) : undefined;
  const filtersActive = Boolean(nav.q || nav.st || nav.au || nav.conn);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => filterArticles(articles, { ...emptyFilters, q: nav.q }, article => [
    ...searchable(article), ...allIdeaIds(article).flatMap(id => [ideaById.get(id)!.name[locale], ideaById.get(id)!.short[locale]]),
  ]).filter(article => (!st.length || st.includes(article.status)) && (!au.length || article.profiles.some(profile => au.includes(profile)))),
  [articles, nav.q, nav.st, nav.au, locale, searchable]);
  const itemsFor = (idea: string) => filtered.filter(article => inIdea(article, idea, connections)).sort(byIdeaOrder);

  const products = new Set(filtered.flatMap(article => article.products)).size;
  const kpis = [
    { value: filtered.length, label: tr('kpiNews'), accent: 'lime' },
    { value: ideas.filter(idea => filtered.some(article => inIdea(article, idea.id, connections))).length, label: tr('kpiIdeas') },
    { value: filtered.filter(article => article.status === 'GA').length, label: tr('kpiGa'), accent: 'aqua' },
    { value: filtered.filter(article => article.status === 'Preview' || article.status === 'Mixto').length, label: tr('kpiPreview') },
    { value: filtered.filter(article => article.status === 'En despliegue' || article.status === 'Próximamente').length, label: tr('kpiSoon') },
    { value: products, label: tr('kpiProducts') },
  ];

  function toggleList(key: 'st' | 'au', list: string[], value: string) {
    const next = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
    const order: readonly string[] = key === 'st' ? statusOrder : profiles;
    navigate({ [key]: order.filter(item => next.includes(item)).join(','), cell: '' }, true);
  }
  function goIdea(id: string) {
    navigate({ idea: id, article: '' });
    window.scrollTo({ top: document.getElementById('ideas-views')?.offsetTop ?? 0, behavior: 'instant' });
  }
  function exportCsv() {
    const rows = (openIdea ? itemsFor(openIdea.id) : [...filtered].sort(byIdeaOrder));
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      ['ID', tr('csvTitle'), tr('csvIdea'), tr('csvAlso'), tr('csvArea'), tr('csvStatus'), tr('csvProfiles'), tr('csvProducts'), tr('csvSource')],
      ...rows.map(article => [
        article.id, article.title, primaryIdea(article).name[locale], connectedIdeas(article).map(idea => idea.name[locale]).join('; '),
        areaLabel(locale, article.area), statusLabel(locale, article.status), article.profiles.map(profile => profileLabel(locale, profile)).join('; '),
        article.products.map(product => productLabel(locale, product)).join('; '), article.sourceUrl,
      ]),
    ];
    const blob = new Blob(['\ufeff' + lines.map(line => line.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ignite-2026-${openIdea ? openIdea.id : 'ideas'}-${locale}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const lensButtons: [Lens, string][] = [
    ['ideas', tr('lensIdeas')], ['constellation', tr('lensConstellation')], ['matrix', tr('lensMatrix')],
    ['products', tr('lensProducts')], ['status', tr('lensStatus')], ['all', tr('lensAll')],
  ];
  const row = (article: Article) => <ArticleRow key={article.id} article={article} locale={locale} query={nav.q} onOpen={() => openArticle(article)} />;
  const empty = <div className="empty-state"><Search size={36} /><h3>{tr('emptySearchTitle')}</h3><p>{tr('emptySearch')}</p>
    <button className="button secondary" onClick={() => navigate({ ...emptyIdeaState, q: '', lens: nav.lens })}>{tr('removeFilters')}</button></div>;

  return <div className="ideas-page">
    <section className="ideas-hero section-wrap">
      <div className="page-intro">
        <span className="eyebrow">{tr('ideasEyebrow')}</span>
        <h1>{tr('ideasTitleA')} <span className="accent">{tr('ideasTitleB')}</span></h1>
        <p>{tr('ideasIntro', { news: articles.length, ideas: ideas.length, pillars: pillars.length })}</p>
      </div>
      <div className="ideas-kpis">{kpis.map(kpi => <Kpi key={kpi.label} {...kpi} />)}</div>
      <nav className="idea-strip" aria-label={tr('ideaStrip')}>
        {ideas.map(idea => <IdeaChip key={idea.id} idea={idea} locale={locale} primary={openIdea?.id === idea.id} onClick={() => goIdea(idea.id)} />)}
      </nav>
    </section>

    <section className="section-wrap ideas-controls" id="ideas-views">
      <div className="ideas-filterbar">
        <div className="search-bar compact"><Search size={20} aria-hidden="true" /><label className="sr-only" htmlFor="ideas-search">{tr('searchLabel')}</label>
          <input id="ideas-search" ref={searchRef} type="search" placeholder={tr('ideasSearchPlaceholder')} value={nav.q} onChange={event => navigate({ q: event.target.value, cell: '' }, true)} />
          <kbd title={tr('slashHint')}>/</kbd></div>
        <div className="chip-group" role="group" aria-label={tr('statusChips')}>
          <span className="chip-label">{tr('statusChips')}</span>
          {statusOrder.filter(status => articles.some(article => article.status === status)).map(status => <button key={status} type="button" className={`filter-chip st-${statusKeys[status]}`} aria-pressed={st.includes(status)} onClick={() => toggleList('st', st, status)}><span className="chip-dot" />{statusLabel(locale, status)}</button>)}
        </div>
        <div className="chip-group" role="group" aria-label={tr('audienceChips')}>
          <span className="chip-label">{tr('audienceChips')}</span>
          {profiles.map(profile => <button key={profile} type="button" className="filter-chip" aria-pressed={au.includes(profile)} onClick={() => toggleList('au', au, profile)}>{profileLabel(locale, profile)}</button>)}
        </div>
        <div className="ideas-meta">
          <label className="switch" title={tr('connectionsHint')}><input type="checkbox" checked={connections} onChange={event => navigate({ conn: event.target.checked ? '' : '0', cell: '' }, true)} /><span className="switch-track" aria-hidden="true" />{tr('includeConnections')}</label>
          <p role="status"><strong>{filtered.length}</strong> / {articles.length} <span className="sr-only">{tr('resultCount', { count: filtered.length, total: articles.length })}</span></p>
          {filtersActive && <button type="button" className="text-button clear-filters" onClick={() => navigate({ q: '', st: '', au: '', conn: '', cell: '' }, true)}><X size={14} />{tr('clearAll')}</button>}
          <button type="button" className="button secondary small" onClick={exportCsv}><Download size={16} />{tr('exportCsv')}</button>
        </div>
      </div>
      <div className="lens-tabs" role="group" aria-label={tr('lensLabel')}>
        {lensButtons.map(([id, label]) => <button key={id} type="button" aria-pressed={lens === id && !openIdea} className={lens === id && !openIdea ? 'active' : ''} onClick={() => navigate({ lens: id === 'ideas' ? '' : id, idea: '', cell: '' })}>{label}</button>)}
      </div>
    </section>

    <section className="section-wrap ideas-view" aria-live="polite">
      {openIdea ? <IdeaDetail idea={openIdea} items={itemsFor(openIdea.id)} filtered={filtered} locale={locale} tr={tr} onBack={() => navigate({ idea: '' })} onIdea={goIdea} onProduct={product => navigate({ q: productLabel(locale, product) }, true)} renderCard={renderCard} empty={empty} />
        : !filtered.length ? empty
        : lens === 'constellation' ? <Constellation filtered={filtered} locale={locale} tr={tr} onIdea={goIdea} openArticle={openArticle} />
        : lens === 'matrix' ? <Matrix filtered={filtered} connections={connections} locale={locale} tr={tr} cell={nav.cell} onCell={cell => navigate({ cell }, true)} row={row} />
        : lens === 'products' ? <div className="family-grid">{areas.map(area => {
          const items = filtered.filter(article => article.area === area).sort(byIdeaOrder);
          if (!items.length) return null;
          const Icon = areaIcons[area];
          return <article key={area} className="family-card"><header><Icon size={20} aria-hidden="true" /><h2>{areaLabel(locale, area)}</h2><span className="count">{items.length}</span></header>
            <StatusBar items={items} locale={locale} />
            <div className="tags">{topProducts(items, 4).map(([product, count]) => <span key={product}>{productLabel(locale, product)} · {count}</span>)}</div>
            <ul className="idea-rows">{items.map(row)}</ul></article>;
        })}</div>
        : lens === 'status' ? <div className="kanban">{statusOrder.map(status => {
          const items = filtered.filter(article => article.status === status).sort(byIdeaOrder);
          return <section key={status} className={`kanban-col st-${statusKeys[status]}`} aria-label={statusLabel(locale, status)}><header><span className="chip-dot" /><h2>{statusLabel(locale, status)}</h2><span className="count">{items.length}</span></header>
            {items.length ? <ul className="idea-rows">{items.map(row)}</ul> : <p className="muted-note">{tr('statusEmpty')}</p>}</section>;
        })}</div>
        : lens === 'all' ? <div className="all-list">{ideas.map(idea => {
          const items = filtered.filter(article => primaryIdea(article).id === idea.id).sort(byIdeaOrder);
          if (!items.length) return null;
          const Icon = ideaIcons[idea.icon];
          return <section key={idea.id} className="all-group" style={ideaStyle(idea)}><header><button type="button" onClick={() => goIdea(idea.id)}><Icon size={18} aria-hidden="true" />{idea.name[locale]}</button><span className="count">{items.length}</span></header><ul className="idea-rows">{items.map(row)}</ul></section>;
        })}</div>
        : <div className="pillars">{pillars.map(pillar => {
          const pillarIdeas = ideas.filter(idea => idea.pillar === pillar.id);
          const pillarNews = filtered.filter(article => pillarIdeas.some(idea => inIdea(article, idea.id, connections))).length;
          return <section key={pillar.id} className="pillar" aria-labelledby={`pillar-${pillar.id}`}>
            <div className="pillar-head"><h2 id={`pillar-${pillar.id}`}>{pillar.name[locale]}</h2><p>{pillar.description[locale]}</p><span className="section-note">{tr('pillarCount', { count: pillarIdeas.length, news: pillarNews })}</span></div>
            <div className="idea-grid">{pillarIdeas.map(idea => {
              const items = itemsFor(idea.id);
              const primary = items.filter(article => primaryIdea(article).id === idea.id).length;
              const Icon = ideaIcons[idea.icon];
              return <button key={idea.id} type="button" className={`idea-card ${items.length ? '' : 'is-empty'}`} style={ideaStyle(idea)} onClick={() => goIdea(idea.id)} aria-label={`${tr('openIdea')}: ${idea.name[locale]} (${items.length})`}>
                <span className="idea-card-top"><span className="idea-icon"><Icon size={22} aria-hidden="true" /></span><span className="idea-count">{items.length}</span></span>
                <strong>{idea.name[locale]}</strong>
                <span className="idea-tagline">{idea.tagline[locale]}</span>
                <StatusBar items={items} locale={locale} />
                <span className="idea-split">{tr('primaryCount', { count: primary })}{connections && items.length > primary ? ` · ${tr('connectedCount', { count: items.length - primary })}` : ''}</span>
                <span className="tags">{topProducts(items, 3).map(([product]) => <span key={product}>{productLabel(locale, product)}</span>)}</span>
              </button>;
            })}</div>
          </section>;
        })}</div>}
    </section>
  </div>;
}

function IdeaDetail({ idea, items, filtered, locale, tr, onBack, onIdea, onProduct, renderCard, empty }: {
  idea: Idea; items: Article[]; filtered: Article[]; locale: Locale; tr: Translate; onBack: () => void; onIdea: (id: string) => void;
  onProduct: (product: string) => void; renderCard: (article: Article) => ReactNode; empty: ReactNode;
}) {
  const Icon = ideaIcons[idea.icon];
  const pillar = pillars.find(item => item.id === idea.pillar)!;
  const primary = items.filter(article => primaryIdea(article).id === idea.id).length;
  const related = coIdeas(idea.id, filtered).slice(0, 8);
  return <div className="idea-detail" style={ideaStyle(idea)}>
    <button type="button" className="text-button muted" onClick={onBack}><ArrowLeft size={17} />{tr('backToIdeas')}</button>
    <header className="idea-detail-hero">
      <span className="idea-icon large"><Icon size={34} aria-hidden="true" /></span>
      <div><span className="eyebrow">{pillar.name[locale]}</span><h2>{idea.name[locale]}</h2><p className="idea-tagline">{idea.tagline[locale]}</p><p>{idea.description[locale]}</p></div>
    </header>
    <div className="ideas-kpis compact">
      <Kpi value={items.length} label={tr('kpiNews')} accent="lime" />
      <Kpi value={primary} label={tr('kpiPrimary')} />
      <Kpi value={items.filter(article => article.status === 'GA').length} label={tr('kpiGa')} accent="aqua" />
      <Kpi value={new Set(items.flatMap(article => article.products)).size} label={tr('kpiProducts')} />
    </div>
    <StatusBar items={items} locale={locale} />
    {related.length > 0 && <div className="detail-group"><span className="eyebrow">{tr('ideaConnected')}</span><div className="chip-row">{related.map(([id, count]) => <IdeaChip key={id} idea={ideaById.get(id)!} locale={locale} onClick={() => onIdea(id)} suffix={<span className="chip-count" title={tr('sharedNews', { count })}>{count}</span>} />)}</div></div>}
    {items.length > 0 && <div className="detail-group"><span className="eyebrow">{tr('ideaProducts')}</span><div className="chip-row">{topProducts(items, 10).map(([product, count]) => <button key={product} type="button" className="filter-chip" onClick={() => onProduct(product)}>{productLabel(locale, product)}<span className="chip-count">{count}</span></button>)}</div></div>}
    <h3 className="detail-group-title">{tr('ideaNews')}</h3>
    {items.length ? <div className="article-grid">{items.map(renderCard)}</div> : empty}
  </div>;
}

function Constellation({ filtered, locale, tr, onIdea, openArticle }: { filtered: Article[]; locale: Locale; tr: Translate; onIdea: (id: string) => void; openArticle: (article: Article) => void }) {
  const layout = useMemo(() => constellationLayout(), []);
  const [hover, setHover] = useState<{ idea?: string; article?: string }>({});
  const visible = new Set(filtered.map(article => article.id));
  const byId = new Map(filtered.map(article => [article.id, article]));
  const edges = ideaEdges(filtered);
  const max = Math.max(1, ...edges.map(edge => edge.weight));
  const active = hover.idea ?? (hover.article ? primaryIdea({ id: hover.article }).id : undefined);
  const linked = new Set(active ? [active, ...edges.filter(edge => edge.a === active || edge.b === active).map(edge => edge.a === active ? edge.b : edge.a)] : []);
  const { W, H, cx, cy } = layout;

  const dots = layout.order.flatMap(id => {
    const { x, y, angle } = layout.positions.get(id)!;
    const { r } = clusterRadius(layout.primaries.get(id)!.length);
    return layout.primaries.get(id)!.map((article, k) => {
      const rr = r + 11 + 5.8 * Math.sqrt(k);
      const theta = angle + Math.PI + k * 2.39996;
      return { article, idea: id, x: x + rr * Math.cos(theta), y: y + rr * Math.sin(theta) };
    });
  });
  const tooltip = hover.article && byId.get(hover.article) ? (() => {
    const dot = dots.find(item => item.article.id === hover.article)!;
    const article = byId.get(hover.article!)!;
    return { x: dot.x, y: dot.y, title: article.title, sub: `${primaryIdea(article).short[locale]} · ${statusLabel(locale, article.status)}` };
  })() : hover.idea ? (() => {
    const idea = ideaById.get(hover.idea!)!;
    const { x, y } = layout.positions.get(idea.id)!;
    const count = filtered.filter(article => allIdeaIds(article).includes(idea.id)).length;
    return { x, y, title: idea.name[locale], sub: `${count} ${tr('kpiNews')} · ${idea.tagline[locale]}` };
  })() : undefined;

  return <div className="constellation">
    <p className="view-hint">{tr('constellationHint')}</p>
    <div className="constellation-stage"><div className="constellation-canvas">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={tr('constellationLabel')} onMouseLeave={() => setHover({})}>
        <ellipse cx={cx} cy={cy} rx={365} ry={290} className="orbit" />
        <g className="edges">{edges.map(edge => {
          const a = layout.positions.get(edge.a)!, b = layout.positions.get(edge.b)!;
          const qx = (a.x + b.x) / 2 * 0.45 + cx * 0.55, qy = (a.y + b.y) / 2 * 0.45 + cy * 0.55;
          const on = active ? edge.a === active || edge.b === active : false;
          return <path key={`${edge.a}|${edge.b}`} d={`M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`} className={on ? 'on' : active ? 'off' : ''}
            style={{ strokeWidth: 0.8 + 4.2 * edge.weight / max, stroke: on ? ideaColor(ideaById.get(active!)!.hue, 0.85) : undefined }} />;
        })}</g>
        <g className="pillar-labels">{pillars.map(pillar => {
          const own = layout.order.filter(id => ideaById.get(id)!.pillar === pillar.id).map(id => layout.positions.get(id)!.angle);
          const angle = Math.atan2(own.reduce((s, v) => s + Math.sin(v), 0), own.reduce((s, v) => s + Math.cos(v), 0));
          return <text key={pillar.id} x={cx + 0.6 * 365 * Math.cos(angle)} y={cy + 0.6 * 290 * Math.sin(angle)} textAnchor="middle">{pillar.name[locale].toUpperCase()}</text>;
        })}</g>
        <g className="center-total"><text x={cx} y={cy - 4} textAnchor="middle" className="total">{filtered.length}</text><text x={cx} y={cy + 26} textAnchor="middle" className="total-label">{tr('constellationCenter')}</text></g>
        {layout.order.map(id => {
          const idea = ideaById.get(id)!;
          const Icon = ideaIcons[idea.icon];
          const { x, y, angle } = layout.positions.get(id)!;
          const { r, outer } = clusterRadius(layout.primaries.get(id)!.length);
          const count = filtered.filter(article => allIdeaIds(article).includes(id)).length;
          const lx = x + (outer + 12) * Math.cos(angle), ly = y + (outer + 12) * Math.sin(angle);
          const dim = active && !linked.has(id);
          return <g key={id} className={`hub ${dim ? 'dim' : ''} ${active === id ? 'on' : ''} ${count ? '' : 'empty'}`} tabIndex={0} role="button"
            aria-label={`${tr('openIdea')}: ${idea.name[locale]} (${count})`}
            onMouseEnter={() => setHover({ idea: id })} onFocus={() => setHover({ idea: id })} onBlur={() => setHover({})}
            onClick={() => onIdea(id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onIdea(id); } }}>
            <circle cx={x} cy={y} r={outer} className="halo" style={{ fill: ideaColor(idea.hue, 0.07), stroke: ideaColor(idea.hue, 0.28) }} />
            <circle cx={x} cy={y} r={r} style={{ fill: ideaColor(idea.hue, 0.9) }} />
            <Icon x={x - 10} y={y - 10} width={20} height={20} className="hub-icon" aria-hidden="true" />
            <text x={lx} y={ly + 4} textAnchor={Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle'} className="hub-label">{idea.short[locale]} <tspan className="hub-count">{count}</tspan></text>
          </g>;
        })}
        <g className="dots">{dots.map(dot => {
          const idea = ideaById.get(dot.idea)!;
          const shown = visible.has(dot.article.id);
          const dim = !shown || (active && !linked.has(dot.idea) && !allIdeaIds(dot.article).includes(active));
          return <circle key={dot.article.id} cx={dot.x} cy={dot.y} r={hover.article === dot.article.id ? 7 : 4.6} className={`dot ${dim ? 'dim' : ''}`}
            style={{ fill: ideaColor(idea.hue) }} tabIndex={shown ? 0 : -1} role={shown ? 'button' : undefined}
            aria-label={shown ? byId.get(dot.article.id)!.title : undefined} aria-hidden={shown ? undefined : true}
            onMouseEnter={() => shown && setHover({ article: dot.article.id })} onFocus={() => setHover({ article: dot.article.id })} onBlur={() => setHover({})}
            onClick={() => shown && openArticle(byId.get(dot.article.id)!)}
            onKeyDown={event => { if (shown && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openArticle(byId.get(dot.article.id)!); } }} />;
        })}</g>
      </svg>
      {tooltip && <div className="constellation-tip" style={{ left: `${tooltip.x / W * 100}%`, top: `${tooltip.y / H * 100}%` }} aria-hidden="true"><strong>{tooltip.title}</strong><span>{tooltip.sub}</span></div>}
    </div></div>
  </div>;
}

function Matrix({ filtered, connections, locale, tr, cell, onCell, row }: {
  filtered: Article[]; connections: boolean; locale: Locale; tr: Translate; cell: string; onCell: (cell: string) => void; row: (article: Article) => ReactNode;
}) {
  const cellItems = (idea: string, area: string) => filtered.filter(article => article.area === area && inIdea(article, idea, connections));
  const values = ideas.map(idea => areas.map(area => cellItems(idea.id, area).length));
  const max = Math.max(1, ...values.flat());
  const [selIdea, selArea] = cell.split('|');
  const selected = ideaById.get(selIdea) && (areas as readonly string[]).includes(selArea) ? cellItems(selIdea, selArea).sort(byIdeaOrder) : undefined;
  return <div className="matrix">
    <p className="view-hint">{tr('matrixHint')}</p>
    <div className="matrix-scroll"><table>
      <thead><tr><th scope="col">{tr('matrixIdea')}</th>{areas.map(area => { const Icon = areaIcons[area]; return <th key={area} scope="col"><span><Icon size={15} aria-hidden="true" />{areaLabel(locale, area)}</span></th>; })}<th scope="col">{tr('matrixTotal')}</th></tr></thead>
      <tbody>{pillars.map(pillar => <Fragment key={pillar.id}>
        <tr className="matrix-pillar"><th colSpan={areas.length + 2} scope="colgroup">{pillar.name[locale]}</th></tr>
        {ideas.filter(idea => idea.pillar === pillar.id).map(idea => {
          const i = ideas.indexOf(idea);
          const Icon = ideaIcons[idea.icon];
          return <tr key={idea.id} style={ideaStyle(idea)}>
            <th scope="row"><span><Icon size={15} aria-hidden="true" />{idea.short[locale]}</span></th>
            {areas.map((area, j) => {
              const v = values[i][j];
              const key = `${idea.id}|${area}`;
              const alpha = 0.12 + 0.78 * v / max;
              return <td key={area}>{v ? <button type="button" aria-pressed={cell === key} className={alpha > 0.55 ? 'strong' : ''} style={{ background: ideaColor(idea.hue, alpha) }}
                aria-label={tr('matrixCell', { idea: idea.short[locale], area: areaLabel(locale, area), count: v })} onClick={() => onCell(cell === key ? '' : key)}>{v}</button> : <span className="zero">·</span>}</td>;
            })}
            <td className="total">{filtered.filter(article => inIdea(article, idea.id, connections)).length}</td>
          </tr>;
        })}
      </Fragment>)}</tbody>
    </table></div>
    <div className="matrix-selection" aria-live="polite">
      {selected?.length ? <><h2>{tr('matrixCell', { idea: ideaById.get(selIdea)!.name[locale], area: areaLabel(locale, selArea as typeof areas[number]), count: selected.length })}</h2><ul className="idea-rows">{selected.map(row)}</ul></>
        : <p className="muted-note">{tr('matrixEmpty')}</p>}
    </div>
  </div>;
}
