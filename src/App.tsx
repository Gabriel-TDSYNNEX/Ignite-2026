import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronLeft, ChevronRight,
  CircleHelp, Code2, Compass, Fingerprint, GitBranch, Globe2,
  LayoutGrid, Monitor, Play, Search, ShieldCheck, Target, Trash2, Users, X,
} from 'lucide-react';
import { articles, emptyFilters, filterArticles, productNames, routeArticles, routes, snapshot } from './catalog';
import { areas, profiles, SOURCE_URL, statuses, type Article } from './schema';
import { areaIcons, MapExplorer } from './MapExplorer';
import { useNavigation, usePreferences, type View } from './state';
import { areaLabel, localizeArticle, localeOptions, productLabel, profileLabel, routeCopy, statusLabel, text, useLocale, type Locale } from './i18n';

const profileIcons = { Negocio: Target, Desarrollo: Code2, IT: Monitor, Seguridad: ShieldCheck };
const statusClass = (status: string) => status === 'GA' ? 'ga' : status === 'Preview' ? 'preview' : 'mixed';

function OfficialLink({ href, children, locale }: { href: string; children: ReactNode; locale: Locale }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> {text(locale, 'externalTab')}</span></a>;
}

function Dialog({ children, onClose, locale, presentation = false }: { children: ReactNode; onClose: () => void; locale: Locale; presentation?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} aria-label={text(locale, presentation ? 'dialogPresentation' : 'dialogArticle')} className={presentation ? 'dialog presentation' : 'dialog'}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button className="icon-button dialog-close" onClick={onClose} aria-label={text(locale, 'close')}><X size={21} /></button>
    {children}
  </dialog>;
}

function ArticleCard({ article, saved, read, onOpen, onSave, locale }: {
  article: Article; saved: boolean; read: boolean; onOpen: () => void; onSave: () => void;
  locale: Locale;
}) {
  const Icon = areaIcons[article.area];
  return <article className="article-card">
    <div className="card-meta"><span className="area-label"><Icon size={16} aria-hidden="true" />{areaLabel(locale, article.area)}</span>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-pressed={saved} aria-label={`${text(locale, saved ? 'removeSaved' : 'addSaved')} ${text(locale, 'saved')}: ${article.title}`}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <span className={`status ${statusClass(article.status)}`}>{statusLabel(locale, article.status)}</span>
    <h3><button onClick={onOpen}>{article.title}</button></h3>
    <p>{article.summary}</p>
    <div className="card-bottom"><span>{article.profiles.slice(0, 2).map(profile => profileLabel(locale, profile)).join(' / ')}</span><button onClick={onOpen} aria-label={`${text(locale, 'openArticle')}: ${article.title}`}>{read ? <Check size={15} /> : null}{read ? text(locale, 'read') : text(locale, 'openArticle')}<ArrowUpRight size={17} /></button></div>
  </article>;
}

function ArticleDetail({ article, saved, toggleFavorite, locale }: { article: Article; saved: boolean; toggleFavorite: () => void; locale: Locale }) {
  const Icon = areaIcons[article.area];
  return <div className="article-detail">
    <div className="eyebrow"><Icon size={17} />{areaLabel(locale, article.area)} <span className={`status ${statusClass(article.status)}`}>{statusLabel(locale, article.status)}</span></div>
    <h2>{article.title}</h2><p className="detail-lead">{article.summary}</p>
    <div className="detail-block"><span className="eyebrow">{text(locale, 'detailWhy')}</span><p>{article.impact}</p></div>
    <div className="detail-block opportunity"><span className="eyebrow">{text(locale, 'detailApplication')}</span><p>{article.application}</p><small>{text(locale, 'editorialDisclaimer')}</small></div>
    <details className="technical"><summary>{text(locale, 'technicalDetails')}</summary><p>{article.technical}</p><div className="tags">{article.products.map(product => <span key={product}>{productLabel(locale, product)}</span>)}</div></details>
    <div className="detail-source"><span className="eyebrow">{text(locale, 'sourceClick')}</span><p className="original-title">{article.originalTitle}</p>
      <OfficialLink href={article.sourceUrl} locale={locale}>{text(locale, 'officialSource')}</OfficialLink>
      {article.learnMore.slice(0, 2).map((href, i) => <OfficialLink key={href} href={href} locale={locale}>{text(locale, 'moreFromMicrosoft')}{i > 0 ? ` ${i + 1}` : ''}</OfficialLink>)}
    </div>
    <div className="detail-footer"><span>{article.profiles.map(profile => profileLabel(locale, profile)).join(' · ')}</span><button className="button secondary" onClick={toggleFavorite}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{text(locale, saved ? 'savedLabel' : 'saveLabel')}</button></div>
  </div>;
}

export default function App() {
  const { navigation: nav, navigate } = useNavigation();
  const { locale, setLocale, ui, localeTag, contentLocale, translationLoadError } = useLocale();
  const { preferences, storageError, toggleFavorite, markRead, clear } = usePreferences();
  const [presentation, setPresentation] = useState<{ items: Article[]; index: number; label: string } | null>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const tr = (key: keyof typeof ui.text, values: Record<string, string | number> = {}) => text(locale, key, values);
  const localizedArticles = useMemo(() => articles.map(article => localizeArticle(article, contentLocale)), [contentLocale]);
  const selectedArticle = localizedArticles.find(article => article.id === nav.article);
  const savedArticles = localizedArticles.filter(article => preferences.favorites.includes(article.id));
  const readCount = articles.filter(article => preferences.read.includes(article.id)).length;
  const searchable = (article: Article) => [
    areaLabel(locale, article.area),
    ...article.products.map(product => productLabel(locale, product)),
    ...article.profiles.map(profile => profileLabel(locale, profile)),
    statusLabel(locale, article.status),
  ];
  const visible = filterArticles(nav.view === 'saved' ? savedArticles : localizedArticles, nav, searchable);
  const activeFilters = Boolean(nav.q || nav.area || nav.profile || nav.product || nav.status);
  const currentRouteSource = routes.find(route => route.profile === nav.route);
  const currentRouteCopy = currentRouteSource ? routeCopy(locale, currentRouteSource.profile) : undefined;
  const currentRoute = currentRouteSource && currentRouteCopy ? { ...currentRouteSource, subtitle: currentRouteCopy.title, description: currentRouteCopy.description } : undefined;
  const currentRouteItems = routeArticles(nav.route).map(article => localizeArticle(article, contentLocale));
  const presented = presentation?.items[presentation.index];

  useEffect(() => { if (selectedArticle) markRead(selectedArticle.id); }, [selectedArticle, markRead]);
  useEffect(() => { if (presented) markRead(presented.id); }, [presented, markRead]);
  useEffect(() => {
    if (!presentation) return;
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input,select,textarea')) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        setPresentation(previous => previous ? { ...previous, index: Math.max(0, Math.min(previous.items.length - 1, previous.index + delta)) } : null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [Boolean(presentation)]);

  function openArticle(article: Article) { navigate({ article: article.id }); }
  function changeView(view: View) { navigate({ ...emptyFilters, view, article: '', route: '', map: '' }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function focusCatalog(changes: Partial<typeof nav> = {}) {
    navigate({ view: 'explore', ...changes });
    requestAnimationFrame(() => catalogRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
  }
  function startPresentation(items: Article[], label: string) { if (items.length) setPresentation({ items, index: 0, label }); }
  function renderCard(article: Article) {
    return <ArticleCard key={article.id} article={article} locale={locale} saved={preferences.favorites.includes(article.id)} read={preferences.read.includes(article.id)} onOpen={() => openArticle(article)} onSave={() => toggleFavorite(article.id)} />;
  }
  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{tr('skip')}</a>
    <header className="site-header">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); changeView('explore'); }} aria-label={tr('home')}><img src={`${import.meta.env.BASE_URL}brand/td-synnex.svg`} alt="TD SYNNEX" /></a>
      <span className="brand-divider" /><span className="product-wordmark">Ignite<span> Navigator <b>26</b></span></span>
      <nav aria-label={tr('navPrimary')}>
        <button className={nav.view === 'explore' ? 'active' : ''} onClick={() => changeView('explore')} aria-current={nav.view === 'explore' ? 'page' : undefined}><Compass size={16} />{tr('explore')}</button>
        <button className={nav.view === 'routes' ? 'active' : ''} onClick={() => changeView('routes')} aria-current={nav.view === 'routes' ? 'page' : undefined}><GitBranch size={16} />{tr('routes')}</button>
        <button className={nav.view === 'saved' ? 'active' : ''} onClick={() => changeView('saved')} aria-current={nav.view === 'saved' ? 'page' : undefined}><Bookmark size={16} />{tr('saved')}<span className="nav-count">{savedArticles.length}</span></button>
      </nav>
      <a className="header-source" href={SOURCE_URL} target="_blank" rel="noreferrer">{tr('bookOfNews')}<ArrowUpRight size={15} /><span className="sr-only"> {tr('externalTab')}</span></a>
      <label className="language-picker"><Globe2 size={15} aria-hidden="true" /><span className="sr-only">{ui.language}</span><select aria-label={ui.language} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
        {localeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
    </header>

    {storageError && <div role="alert" className="storage-warning"><CircleHelp size={18} />{storageError === 'read' ? tr('storageReadError') : tr('storageWriteError')}</div>}
    {translationLoadError && <div role="alert" className="storage-warning"><CircleHelp size={18} />{tr('translationLoadError')}</div>}
    <main id="main-content" tabIndex={-1}>
      {nav.view === 'explore' && <>
        <section className="hero">
          <div className="hero-copy"><div className="event-label"><span className="live-dot" />{tr('heroEyebrow')} <span className="event-year">2026</span></div>
            <h1>{tr('heroTitleA')} <span>{tr('heroTitleB')}</span> {tr('heroTitleC')}</h1></div>
          <div className="hero-side"><p>{tr('heroDescription')}</p>
            <div className="hero-actions"><button className="button primary" onClick={() => focusCatalog()}><Search size={18} />{tr('findNews')}<ArrowDown size={17} /></button>
              <button className="text-button" onClick={() => changeView('routes')}>{tr('findRoute')}<ArrowRight size={17} /></button></div>
            <div className="hero-footnote"><span>17–20 NOV</span><span className="tiny-divider" />{tr('eventLocation')}<span className="hero-edition">{tr('edition')}</span></div>
          </div>
        </section>
        <div className="explorer-wrap">
          <MapExplorer path={nav.map} onPath={map => navigate({ map })} onOpenArticle={openArticle}
            onShowCatalog={filter => focusCatalog({ ...emptyFilters, ...filter })}
            read={preferences.read} favorites={preferences.favorites} toggleFavorite={toggleFavorite} markRead={markRead}
            articles={localizedArticles} locale={locale} />
        </div>
        <div className="metrics-strip"><div><strong>{articles.length}<span>{tr('metricsNews')}</span></strong></div><div><strong>{areas.length}<span>{tr('metricsAreas')}</span></strong></div><div><strong>{routes.length}<span>{tr('metricsRoutes')}</span></strong></div><div className="progress-metric"><span className="progress-ring" style={{ '--progress': `${readCount / articles.length * 100}%` } as CSSProperties}><Fingerprint size={23} /></span><strong>{readCount}/{articles.length}<span>{tr('progress')}</span></strong></div></div>
        {!activeFilters && <section className="highlights section-wrap" aria-labelledby="highlights-title"><div className="section-heading"><div><span className="eyebrow">{tr('highlightsEyebrow')}</span><h2 id="highlights-title">{tr('highlightsTitle')}<span className="accent">.</span></h2></div><span className="section-note">{tr('highlightsNote')}</span></div><div className="highlight-grid">{['bon-497', 'bon-479', 'bon-448', 'bon-519'].map(id => localizedArticles.find(article => article.id === id)).filter((article): article is Article => Boolean(article)).map(renderCard)}</div></section>}
      </>}

      {nav.view === 'routes' ? <section className="section-wrap routes-page">
        {currentRoute ? <>
          <button className="text-button muted" onClick={() => navigate({ route: '' })}><ArrowLeft size={17} />{tr('routesBack')}</button>
          <div className="page-intro"><span className="eyebrow">{tr('routeEyebrow')} / {profileLabel(locale, currentRoute.profile).toUpperCase()}</span><h1>{currentRoute.subtitle}<span className="accent">.</span></h1><p>{currentRoute.description}</p><div className="intro-actions"><button className="button primary" onClick={() => startPresentation(currentRouteItems, profileLabel(locale, currentRoute.profile))}><Play size={17} />{tr('presentRoute')}</button><span>{currentRouteItems.filter(a => preferences.read.includes(a.id)).length} / {currentRouteItems.length} {tr('explored')}</span></div></div>
          <div className="route-timeline">{currentRouteItems.map((article, index) => <div key={article.id} className="timeline-item"><span className="timeline-number">{String(index + 1).padStart(2, '0')}</span>{renderCard(article)}</div>)}</div>
        </> : <>
          <div className="page-intro"><span className="eyebrow">{tr('routesIntroEyebrow')}</span><h1>{tr('routesIntroTitle')}<br /><span className="accent">{tr('routesIntroAccent')}</span></h1><p>{tr('routesIntro')}</p></div>
          <div className="route-grid">{routes.map((route, index) => { const Icon = profileIcons[route.profile]; const copy = routeCopy(locale, route.profile); return <button key={route.profile} className="route-card" onClick={() => navigate({ route: route.profile })}><div className="route-top"><Icon size={30} /><span>0{index + 1} / {tr('routeIndex')}</span></div><span className="eyebrow">{profileLabel(locale, route.profile)}</span><h2>{copy.title}</h2><p>{copy.description}</p><div className="route-bottom"><span>{route.ids.length} {tr('stops')} · {tr('atYourPace')}</span><ArrowUpRight size={23} /></div></button>; })}</div>
          <div className="editorial-note"><Users size={24} /><div><strong>{tr('profileStart')}</strong><p>{tr('allRoutesOpen')}</p></div></div>
        </>}
      </section> : <section className="section-wrap catalog-section" ref={catalogRef} aria-labelledby="catalog-title">
        <div className="section-heading"><div><span className="eyebrow">{nav.view === 'saved' ? tr('savedEyebrow') : tr('catalogEyebrow')}</span><h2 id="catalog-title">{nav.view === 'saved' ? tr('saved') : tr('allNews')}<span className="accent">.</span></h2></div>
          {nav.view === 'saved' ? <div className="selection-actions"><button className="button secondary" disabled={!savedArticles.length} onClick={() => startPresentation(savedArticles, tr('saved'))}><Play size={16} />{tr('present')}</button><button className="icon-button" disabled={!savedArticles.length} aria-label={tr('clearSaved')} onClick={() => { if (window.confirm(tr('confirmClear'))) clear(); }}><Trash2 size={18} /></button></div> : <span className="section-note">{tr('catalogNote')}</span>}
        </div>
        {nav.view === 'saved' && <p className="saved-note">{tr('savedNote')}</p>}
        <div className="search-bar"><Search size={22} aria-hidden="true" /><label className="sr-only" htmlFor="search">{tr('searchLabel')}</label><input id="search" type="search" placeholder={tr('searchPlaceholder')} value={nav.q} onChange={event => navigate({ q: event.target.value }, true)} /><kbd aria-hidden="true">{tr('searchButton')}</kbd></div>
        <div className="filters">
          <div className="filter-field"><label htmlFor="filter-area">{tr('areaFilter')}</label><select id="filter-area" value={nav.area} onChange={event => navigate({ area: event.target.value })}><option value="">{tr('allAreas')}</option>{areas.map(area => <option key={area} value={area}>{areaLabel(locale, area)}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-profile">{tr('profileFilter')}</label><select id="filter-profile" value={nav.profile} onChange={event => navigate({ profile: event.target.value })}><option value="">{tr('allProfiles')}</option>{profiles.map(profile => <option key={profile} value={profile}>{profileLabel(locale, profile)}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-product">{tr('productFilter')}</label><select id="filter-product" value={nav.product} onChange={event => navigate({ product: event.target.value })}><option value="">{tr('allProducts')}</option>{productNames.map(product => <option key={product} value={product}>{productLabel(locale, product)}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-status">{tr('availabilityFilter')}</label><select id="filter-status" value={nav.status} onChange={event => navigate({ status: event.target.value })}><option value="">{tr('allStatuses')}</option>{statuses.map(status => <option key={status} value={status}>{statusLabel(locale, status)}</option>)}</select></div>
          {activeFilters && <button className="text-button clear-filters" onClick={() => navigate(emptyFilters)}><X size={14} />{tr('clearFilters')}</button>}
        </div>
        <div className="catalog-meta"><p role="status"><strong>{visible.length}</strong> {visible.length === 1 ? tr('newsOne') : tr('newsMany')}{activeFilters ? ` ${tr('matches')}` : ` ${tr('discover')}`}</p><span><LayoutGrid size={14} />{tr('editorialSelection')}</span></div>
        {visible.length ? <div className="article-grid">{visible.map(renderCard)}</div> : <div className="empty-state"><Search size={36} /><h3>{nav.view === 'saved' && !savedArticles.length ? tr('emptySavedTitle') : tr('emptySearchTitle')}</h3><p>{nav.view === 'saved' && !savedArticles.length ? tr('emptySaved') : tr('emptySearch')}</p><button className="button secondary" onClick={() => nav.view === 'saved' && !savedArticles.length ? changeView('explore') : navigate(emptyFilters)}>{nav.view === 'saved' && !savedArticles.length ? tr('exploreNews') : tr('removeFilters')}<ArrowRight size={16} /></button></div>}
      </section>}

      <section className="bottom-cta"><div><span className="eyebrow">{tr('bottomEyebrow')}</span><h2>{tr('bottomTitle')}<br /><span>{tr('bottomAccent')}</span></h2></div><button className="button primary" onClick={() => changeView(nav.view === 'routes' ? 'explore' : 'routes')}>{nav.view === 'routes' ? tr('exploreAll') : tr('discoverRoute')}<ArrowUpRight size={19} /></button></section>
    </main>
    <footer><div><span className="footer-title">TD SYNNEX <span>/ Ignite Navigator 2026</span></span><p>{tr('sourceDescription')}<br />{tr('unofficial')}</p></div><div className="footer-right"><OfficialLink href={SOURCE_URL} locale={locale}>{tr('officialMicrosoft')}</OfficialLink><span>{tr('acceptedSource')} {new Date(snapshot.acceptedAt).toLocaleDateString(localeTag, { timeZone: 'UTC' })}</span><span>{tr('localSaved')}</span></div></footer>

    {nav.article && <Dialog locale={locale} onClose={() => navigate({ article: '' }, true)}>
      {selectedArticle ? <ArticleDetail article={selectedArticle} locale={locale} saved={preferences.favorites.includes(selectedArticle.id)} toggleFavorite={() => toggleFavorite(selectedArticle.id)} /> : <div className="empty-state"><CircleHelp size={30} /><h2>{tr('notFoundTitle')}</h2><p>{tr('notFound')}</p></div>}
    </Dialog>}
    {presentation && presented && <Dialog locale={locale} presentation onClose={() => setPresentation(null)}><div className="slide-label"><span>IGNITE NAVIGATOR / {presentation.label.toUpperCase()}</span><span>{String(presentation.index + 1).padStart(2, '0')} / {String(presentation.items.length).padStart(2, '0')}</span></div><ArticleDetail article={presented} locale={locale} saved={preferences.favorites.includes(presented.id)} toggleFavorite={() => toggleFavorite(presented.id)} /><div className="slide-controls"><button className="button secondary" disabled={presentation.index === 0} onClick={() => setPresentation({ ...presentation, index: presentation.index - 1 })}><ChevronLeft size={18} />{tr('previous')}</button><span>{tr('presentationNav')}</span><button className="button primary" disabled={presentation.index === presentation.items.length - 1} onClick={() => setPresentation({ ...presentation, index: presentation.index + 1 })}>{tr('next')}<ChevronRight size={18} /></button></div></Dialog>}
  </>;
}
