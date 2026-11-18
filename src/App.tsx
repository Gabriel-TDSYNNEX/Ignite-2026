import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronLeft, ChevronRight,
  CircleHelp, Code2, Compass, Fingerprint, GitBranch,
  LayoutGrid, Monitor, Play, Search, ShieldCheck, Target, Trash2, Users, X,
} from 'lucide-react';
import { articles, emptyFilters, filterArticles, productNames, routeArticles, routes, snapshot } from './catalog';
import { areas, profiles, SOURCE_URL, statuses, type Article } from './schema';
import { areaIcons, areaLabels, MapExplorer } from './MapExplorer';
import { useNavigation, usePreferences, type View } from './state';

const profileIcons = { Negocio: Target, Desarrollo: Code2, IT: Monitor, Seguridad: ShieldCheck };
const statusClass = (status: string) => status === 'GA' ? 'ga' : status === 'Preview' ? 'preview' : 'mixed';

function OfficialLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (abre otra pestaña)</span></a>;
}

function Dialog({ children, onClose, presentation = false }: { children: ReactNode; onClose: () => void; presentation?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow; };
  }, []);
  return <dialog ref={ref} aria-label={presentation ? 'Modo presentación' : 'Detalle de novedad'} className={presentation ? 'dialog presentation' : 'dialog'}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <button className="icon-button dialog-close" onClick={onClose} aria-label="Cerrar"><X size={21} /></button>
    {children}
  </dialog>;
}

function ArticleCard({ article, saved, read, onOpen, onSave }: {
  article: Article; saved: boolean; read: boolean; onOpen: () => void; onSave: () => void;
}) {
  const Icon = areaIcons[article.area];
  return <article className="article-card">
    <div className="card-meta"><span className="area-label"><Icon size={16} aria-hidden="true" />{areaLabels[article.area]}</span>
      <button className={`save-button ${saved ? 'is-saved' : ''}`} onClick={onSave} aria-pressed={saved} aria-label={`${saved ? 'Quitar de' : 'Añadir a'} mi selección: ${article.title}`}><Bookmark size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    <span className={`status ${statusClass(article.status)}`}>{article.status === 'GA' ? 'Disponible · GA' : article.status}</span>
    <h3><button onClick={onOpen}>{article.title}</button></h3>
    <p>{article.summary}</p>
    <div className="card-bottom"><span>{article.profiles.slice(0, 2).join(' / ')}</span><button onClick={onOpen} aria-label={`Explorar: ${article.title}`}>{read ? <Check size={15} /> : null}{read ? 'Leído' : 'Explorar'}<ArrowUpRight size={17} /></button></div>
  </article>;
}

function ArticleDetail({ article, saved, toggleFavorite }: { article: Article; saved: boolean; toggleFavorite: () => void }) {
  const Icon = areaIcons[article.area];
  return <div className="article-detail">
    <div className="eyebrow"><Icon size={17} />{article.area} <span className={`status ${statusClass(article.status)}`}>{article.status}</span></div>
    <h2>{article.title}</h2><p className="detail-lead">{article.summary}</p>
    <div className="detail-block"><span className="eyebrow">01 / Por qué importa</span><p>{article.impact}</p></div>
    <div className="detail-block opportunity"><span className="eyebrow">02 / Una posible aplicación</span><p>{article.application}</p><small>Interpretación editorial, no una recomendación oficial ni una promesa de resultados.</small></div>
    <details className="technical"><summary>Profundizar: detalles y disponibilidad</summary><p>{article.technical}</p><div className="tags">{article.products.map(product => <span key={product}>{product}</span>)}</div></details>
    <div className="detail-source"><span className="eyebrow">La fuente, siempre a un clic</span><p className="original-title">{article.originalTitle}</p>
      <OfficialLink href={article.sourceUrl}>Consultar en Book of News</OfficialLink>
      {article.learnMore.slice(0, 2).map((href, i) => <OfficialLink key={href} href={href}>Ampliación enlazada por Microsoft{i > 0 ? ` ${i + 1}` : ''}</OfficialLink>)}
    </div>
    <div className="detail-footer"><span>{article.profiles.join(' · ')}</span><button className="button secondary" onClick={toggleFavorite}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Guardado en mi selección' : 'Guardar en mi selección'}</button></div>
  </div>;
}

export default function App() {
  const { navigation: nav, navigate } = useNavigation();
  const { preferences, storageError, toggleFavorite, markRead, clear } = usePreferences();
  const [presentation, setPresentation] = useState<{ items: Article[]; index: number; label: string } | null>(null);
  const catalogRef = useRef<HTMLElement>(null);
  const selectedArticle = articles.find(article => article.id === nav.article);
  const savedArticles = articles.filter(article => preferences.favorites.includes(article.id));
  const readCount = articles.filter(article => preferences.read.includes(article.id)).length;
  const visible = filterArticles(nav.view === 'saved' ? savedArticles : articles, nav);
  const activeFilters = Boolean(nav.q || nav.area || nav.profile || nav.product || nav.status);
  const currentRoute = routes.find(route => route.profile === nav.route);
  const currentRouteItems = routeArticles(nav.route);
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
    return <ArticleCard key={article.id} article={article} saved={preferences.favorites.includes(article.id)} read={preferences.read.includes(article.id)} onOpen={() => openArticle(article)} onSave={() => toggleFavorite(article.id)} />;
  }
  return <>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Saltar al contenido</a>
    <header className="site-header">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); changeView('explore'); }} aria-label="TD SYNNEX Ignite Navigator, inicio"><img src={`${import.meta.env.BASE_URL}brand/td-synnex.svg`} alt="TD SYNNEX" /></a>
      <span className="brand-divider" /><span className="product-wordmark">Ignite<span> Navigator <b>26</b></span></span>
      <nav aria-label="Navegación principal">
        <button className={nav.view === 'explore' ? 'active' : ''} onClick={() => changeView('explore')} aria-current={nav.view === 'explore' ? 'page' : undefined}><Compass size={16} />Explorar</button>
        <button className={nav.view === 'routes' ? 'active' : ''} onClick={() => changeView('routes')} aria-current={nav.view === 'routes' ? 'page' : undefined}><GitBranch size={16} />Recorridos</button>
        <button className={nav.view === 'saved' ? 'active' : ''} onClick={() => changeView('saved')} aria-current={nav.view === 'saved' ? 'page' : undefined}><Bookmark size={16} />Mi selección<span className="nav-count">{savedArticles.length}</span></button>
      </nav>
      <a className="header-source" href={SOURCE_URL} target="_blank" rel="noreferrer">Book of News<ArrowUpRight size={15} /><span className="sr-only"> (abre otra pestaña)</span></a>
    </header>

    {storageError && <div role="alert" className="storage-warning"><CircleHelp size={18} />{storageError}</div>}
    <main id="main-content" tabIndex={-1}>
      {nav.view === 'explore' && <>
        <section className="hero">
          <div className="hero-copy"><div className="event-label"><span className="live-dot" />MICROSOFT IGNITE <span className="event-year">2026</span></div>
            <h1>Lo que viene. <span>Lo que importa.</span> Lo que puedes hacer.</h1></div>
          <div className="hero-side"><p>La innovación no está en leerlo todo. Está en descubrir qué cambia para ti. Navega el mapa: entra en un área, acércate a un anuncio y salta a todo lo que está conectado.</p>
            <div className="hero-actions"><button className="button primary" onClick={() => focusCatalog()}><Search size={18} />Buscar en las novedades<ArrowDown size={17} /></button>
              <button className="text-button" onClick={() => changeView('routes')}>Encuentra tu recorrido<ArrowRight size={17} /></button></div>
            <div className="hero-footnote"><span>17–20 NOV</span><span className="tiny-divider" />SAN FRANCISCO + ONLINE<span className="hero-edition">EDICIÓN EN ESPAÑOL</span></div>
          </div>
        </section>
        <div className="explorer-wrap">
          <MapExplorer path={nav.map} onPath={map => navigate({ map })} onOpenArticle={openArticle}
            onShowCatalog={filter => focusCatalog({ ...emptyFilters, ...filter })}
            read={preferences.read} favorites={preferences.favorites} toggleFavorite={toggleFavorite} markRead={markRead} />
        </div>
        <div className="metrics-strip"><div><strong>{articles.length}<span>novedades para explorar</span></strong></div><div><strong>{areas.length}<span>áreas conectadas</span></strong></div><div><strong>{routes.length}<span>recorridos a tu medida</span></strong></div><div className="progress-metric"><span className="progress-ring" style={{ '--progress': `${readCount / articles.length * 100}%` } as CSSProperties}><Fingerprint size={23} /></span><strong>{readCount}/{articles.length}<span>tu progreso de exploración</span></strong></div></div>
        {!activeFilters && <section className="highlights section-wrap" aria-labelledby="highlights-title"><div className="section-heading"><div><span className="eyebrow">UNA BUENA FORMA DE EMPEZAR</span><h2 id="highlights-title">En nuestro radar<span className="accent">.</span></h2></div><span className="section-note">Cuatro ideas para abrir la conversación</span></div><div className="highlight-grid">{['bon-497', 'bon-479', 'bon-448', 'bon-519'].map(id => articles.find(article => article.id === id)).filter((article): article is Article => Boolean(article)).map(renderCard)}</div></section>}
      </>}

      {nav.view === 'routes' ? <section className="section-wrap routes-page">
        {currentRoute ? <>
          <button className="text-button muted" onClick={() => navigate({ route: '' })}><ArrowLeft size={17} />Todos los recorridos</button>
          <div className="page-intro"><span className="eyebrow">TU RECORRIDO / {currentRoute.profile.toUpperCase()}</span><h1>{currentRoute.subtitle}<span className="accent">.</span></h1><p>{currentRoute.description}</p><div className="intro-actions"><button className="button primary" onClick={() => startPresentation(currentRouteItems, currentRoute.profile)}><Play size={17} />Presentar recorrido</button><span>{currentRouteItems.filter(a => preferences.read.includes(a.id)).length} de {currentRouteItems.length} exploradas</span></div></div>
          <div className="route-timeline">{currentRouteItems.map((article, index) => <div key={article.id} className="timeline-item"><span className="timeline-number">{String(index + 1).padStart(2, '0')}</span>{renderCard(article)}</div>)}</div>
        </> : <>
          <div className="page-intro"><span className="eyebrow">NO NECESITAS EMPEZAR POR TODO</span><h1>Empieza por<br /><span className="accent">lo que te mueve.</span></h1><p>Cuatro miradas sobre un mismo futuro. Elige tu perfil y conecta las novedades con tu día a día.</p></div>
          <div className="route-grid">{routes.map((route, index) => { const Icon = profileIcons[route.profile]; return <button key={route.profile} className="route-card" onClick={() => navigate({ route: route.profile })}><div className="route-top"><Icon size={30} /><span>0{index + 1} / RECORRIDO</span></div><span className="eyebrow">{route.profile}</span><h2>{route.subtitle}</h2><p>{route.description}</p><div className="route-bottom"><span>{route.ids.length} paradas · A tu ritmo</span><ArrowUpRight size={23} /></div></button>; })}</div>
          <div className="editorial-note"><Users size={24} /><div><strong>Tu perfil es un punto de partida, no un límite.</strong><p>Todos los recorridos están abiertos. Explora otras miradas o crea tu propio itinerario guardando novedades.</p></div></div>
        </>}
      </section> : <section className="section-wrap catalog-section" ref={catalogRef} aria-labelledby="catalog-title">
        <div className="section-heading"><div><span className="eyebrow">{nav.view === 'saved' ? 'TU PROPIO ITINERARIO' : 'DEL ANUNCIO A LA POSIBILIDAD'}</span><h2 id="catalog-title">{nav.view === 'saved' ? 'Mi selección' : 'Todas las novedades'}<span className="accent">.</span></h2></div>
          {nav.view === 'saved' ? <div className="selection-actions"><button className="button secondary" disabled={!savedArticles.length} onClick={() => startPresentation(savedArticles, 'Mi selección')}><Play size={16} />Presentar</button><button className="icon-button" disabled={!savedArticles.length} aria-label="Vaciar mi selección" onClick={() => { if (window.confirm('¿Quitar todas las novedades de tu selección?')) clear(); }}><Trash2 size={18} /></button></div> : <span className="section-note">Con contexto. En español. A tu ritmo.</span>}
        </div>
        {nav.view === 'saved' && <p className="saved-note">Solo en este navegador, sin cuentas ni seguimiento. Guarda novedades desde cualquier tarjeta.</p>}
        <div className="search-bar"><Search size={22} aria-hidden="true" /><label className="sr-only" htmlFor="search">Buscar novedades</label><input id="search" type="search" placeholder="¿Qué quieres descubrir? Prueba «agentes», «seguridad» o «Power BI»" value={nav.q} onChange={event => navigate({ q: event.target.value }, true)} /><kbd aria-hidden="true">BUSCAR</kbd></div>
        <div className="filters">
          <div className="filter-field"><label htmlFor="filter-area">Área</label><select id="filter-area" value={nav.area} onChange={event => navigate({ area: event.target.value })}><option value="">Todas las áreas</option>{areas.map(area => <option key={area} value={area}>{areaLabels[area]}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-profile">Tu perfil</label><select id="filter-profile" value={nav.profile} onChange={event => navigate({ profile: event.target.value })}><option value="">Todos los perfiles</option>{profiles.map(profile => <option key={profile}>{profile}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-product">Producto</label><select id="filter-product" value={nav.product} onChange={event => navigate({ product: event.target.value })}><option value="">Todos los productos</option>{productNames.map(product => <option key={product}>{product}</option>)}</select></div>
          <div className="filter-field"><label htmlFor="filter-status">Disponibilidad</label><select id="filter-status" value={nav.status} onChange={event => navigate({ status: event.target.value })}><option value="">Todos los estados</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></div>
          {activeFilters && <button className="text-button clear-filters" onClick={() => navigate(emptyFilters)}><X size={14} />Limpiar filtros</button>}
        </div>
        <div className="catalog-meta"><p role="status"><strong>{visible.length}</strong> {visible.length === 1 ? 'novedad' : 'novedades'}{activeFilters ? ' que encajan contigo' : ' por descubrir'}</p><span><LayoutGrid size={14} />SELECCIÓN EDITORIAL TD SYNNEX</span></div>
        {visible.length ? <div className="article-grid">{visible.map(renderCard)}</div> : <div className="empty-state"><Search size={36} /><h3>{nav.view === 'saved' && !savedArticles.length ? 'Tu siguiente descubrimiento empieza aquí' : 'No encontramos esa combinación'}</h3><p>{nav.view === 'saved' && !savedArticles.length ? 'Usa el marcador de una tarjeta para guardar una novedad y preparar tu propio recorrido.' : 'Prueba otro término o amplía los filtros. Hay todo un ecosistema por explorar.'}</p><button className="button secondary" onClick={() => nav.view === 'saved' && !savedArticles.length ? changeView('explore') : navigate(emptyFilters)}>{nav.view === 'saved' && !savedArticles.length ? 'Explorar novedades' : 'Quitar filtros' }<ArrowRight size={16} /></button></div>}
      </section>}

      <section className="bottom-cta"><div><span className="eyebrow">LA INNOVACIÓN EMPIEZA CON UNA CONVERSACIÓN</span><h2>No solo qué hay de nuevo.<br /><span>Qué puedes hacer con ello.</span></h2></div><button className="button primary" onClick={() => changeView(nav.view === 'routes' ? 'explore' : 'routes')}>{nav.view === 'routes' ? 'Explorar todas las novedades' : 'Descubrir mi recorrido'}<ArrowUpRight size={19} /></button></section>
    </main>
    <footer><div><span className="footer-title">TD SYNNEX <span>/ Ignite Navigator 2026</span></span><p>Resúmenes e interpretación editorial a partir del Microsoft Ignite Book of News.<br />Portal no oficial. Consulta siempre las fuentes, disponibilidad y condiciones originales.</p></div><div className="footer-right"><OfficialLink href={SOURCE_URL}>Fuente oficial de Microsoft</OfficialLink><span>Fuente aceptada: {new Date(snapshot.acceptedAt).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span><span>Tu selección se guarda solo en este navegador.</span></div></footer>

    {nav.article && <Dialog onClose={() => navigate({ article: '' }, true)}>
      {selectedArticle ? <ArticleDetail article={selectedArticle} saved={preferences.favorites.includes(selectedArticle.id)} toggleFavorite={() => toggleFavorite(selectedArticle.id)} /> : <div className="empty-state"><CircleHelp size={30} /><h2>Novedad no encontrada</h2><p>Este enlace no corresponde al catálogo actual. Vuelve al explorador para consultar las novedades disponibles.</p></div>}
    </Dialog>}
    {presentation && presented && <Dialog presentation onClose={() => setPresentation(null)}><div className="slide-label"><span>IGNITE NAVIGATOR / {presentation.label.toUpperCase()}</span><span>{String(presentation.index + 1).padStart(2, '0')} / {String(presentation.items.length).padStart(2, '0')}</span></div><ArticleDetail article={presented} saved={preferences.favorites.includes(presented.id)} toggleFavorite={() => toggleFavorite(presented.id)} /><div className="slide-controls"><button className="button secondary" disabled={presentation.index === 0} onClick={() => setPresentation({ ...presentation, index: presentation.index - 1 })}><ChevronLeft size={18} />Anterior</button><span>← → para navegar · Esc para salir</span><button className="button primary" disabled={presentation.index === presentation.items.length - 1} onClick={() => setPresentation({ ...presentation, index: presentation.index + 1 })}>Siguiente<ChevronRight size={18} /></button></div></Dialog>}
  </>;
}
