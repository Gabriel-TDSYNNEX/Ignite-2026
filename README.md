# TD SYNNEX · Ignite Navigator 2026

Portal editorial público y estático sobre el [Microsoft Ignite 2026 Book of News](https://news.microsoft.com/events/ignite/2026/book-of-news/). Incluye 59 anuncios de la fuente inicial, resúmenes propios en español, mapa interactivo navegable (zoom por niveles Ignite → área → producto → anuncio, con saltos a productos y anuncios relacionados desde cada anuncio, migas de pan, arrastre y rueda para zoom, vista de lista en móvil y tableta vertical), búsqueda, filtros, cuatro recorridos, favoritos locales y presentación.

No es un portal oficial de Microsoft. Las aplicaciones propuestas son interpretación editorial, no compromisos de producto. Verificar siempre las fuentes, disponibilidad, licencias y requisitos. Algunas novedades combinan capacidades GA, preview y futuras.

## Desarrollo

Requiere Node.js 24 y npm.

```powershell
npm ci
npm run dev
```

Abrir la dirección local indicada por Vite. El navegador no envía búsquedas ni favoritos a un servidor. No hay analítica, autenticación, chat ni llamadas a modelos. Los enlaces a fuentes externas se abren en otra pestaña.

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de navegador compilan y sirven el artefacto real bajo `/Ignite-2026/`, no solo el servidor de desarrollo. Requieren el puerto local 4173 libre. En Linux CI se utiliza `npx playwright install --with-deps chromium`.

Para comprobar manualmente una compilación con subruta:

```powershell
$env:PAGES_BASE = '/Ignite-2026/'
npm run build
npm run preview
```

Los favoritos y anuncios leídos se guardan bajo la clave local `tdsynnex-ignite-2026`. No se sincronizan entre dispositivos. El portal informa si el almacenamiento está bloqueado. Borrar los datos del sitio elimina la selección.

## GitHub Pages

Repositorio creado por el usuario: **[`Gabriel-TDSYNNEX/Ignite-2026`](https://github.com/Gabriel-TDSYNNEX/Ignite-2026)**.

Cuenta autorizada por el propietario: **Gabriel-TDSYNNEX**. URL prevista: `https://gabriel-tdsynnex.github.io/Ignite-2026/`. El estado real de publicación debe comprobarse en GitHub Actions y en esa URL.

1. Antes de inicializar o subir Git, confirmar que `.gitignore` excluye `tdsynnex-customizacion/`, `.env*`, `node_modules/` y los textos originales descargados en `content/incoming.json`.
2. Comprobar que solo están autorizados para publicación los activos necesarios de `public/brand/`. El catálogo PowerPoint y documentos de referencia no deben entrar en el historial público.
3. Usar el repositorio público indicado con la rama `main` y subir únicamente el código y activos públicos revisados.
4. En Settings → Pages, seleccionar **GitHub Actions** como origen.
5. Habilitar en Settings → Actions → General la creación de pull requests por GitHub Actions y, si la política de la organización lo exige, autorizar los permisos de escritura del workflow de contenido.
6. Ejecutar **Publish GitHub Pages** o hacer push a `main`. El workflow obtiene la ruta base de Pages automáticamente.
7. Comprobar la URL desplegada, cargar un enlace con `#article=bon-473` y verificar logo, assets, favoritos y navegación móvil.

No se necesitan claves de IA ni secretos personalizados. `GITHUB_TOKEN` lo proporciona GitHub al workflow; no debe copiarse a la aplicación. Configurar revisión obligatoria y proteger `main` es recomendable. Los workflows asumen `main`; adaptar los triggers si se usa otro nombre.

## Cómo actualizar el contenido

Archivos:

- `content/snapshot.json`: metadatos oficiales y huellas de la fuente aceptada. No contiene el texto completo del Book of News.
- `content/editorial.json`: textos originales en español, productos, perfiles y disponibilidad revisada.
- `content/pending.json` y `content/changes.json`: propuesta detectada, solo presentes cuando hay cambios pendientes.
- `content/incoming.json`: descarga local con el texto fuente para revisión; está excluida de Git y del build.

**Review Book of News updates** comprueba la página cada día a las 07:23 UTC y también mediante ejecución manual. El cron de GitHub puede retrasarse. El job crea o actualiza una única PR en `automation/book-of-news`. No publica contenido automáticamente, no traduce con IA y no cambia los resúmenes aceptados.

### Revisar una PR de contenido

1. Abrir la rama propuesta y consultar las altas, cambios y posibles retiradas en `content/changes.json`.
2. Ejecutar `npm run content:fetch` para obtener los textos oficiales actuales en el archivo local ignorado. Compararlos con las fuentes enlazadas; si han cambiado respecto a la propuesta, no aceptar una instantánea obsoleta: actualizar la propuesta primero.
3. Editar `content/editorial.json`: añadir resúmenes propios, corregir los anuncios modificados, retirar los eliminados y revisar productos, perfiles y disponibilidad. No copiar los párrafos originales de Microsoft.
4. Solo después de revisar cada anuncio modificado, actualizar su `sourceHash` al `hash` correspondiente de `content/pending.json` y mantener `reviewed: true`.
5. Revisar también los IDs de los recorridos y destacados si una retirada los afecta.
6. Ejecutar `npm run content:accept`. Comprueba cobertura y huellas, guarda la nueva instantánea y elimina los archivos pendientes. Si falta revisión, falla explícitamente.
7. Ejecutar `npm test` y `npm run test:e2e`; el build valida que no queden anuncios pendientes.
8. Subir los cambios a la PR, obtener revisión y hacer merge. Pages despliega la versión aceptada.

Los commits humanos en la rama de propuesta pausan su actualización automática para no sobrescribir la revisión. Para incorporar nuevas novedades durante esa revisión, ejecutar manualmente `npm run content:check`, revisar los cambios y continuar el mismo proceso. El bot usa force-with-lease exclusivamente sobre su rama dedicada para mantener una sola propuesta y nunca debe usarse esa rama para otros trabajos.

GitHub no dispara normalmente otros workflows a partir de pushes hechos con `GITHUB_TOKEN`. La PR inicial del bot es una propuesta pendiente, no una publicación validada. El commit humano de aceptación dispara la validación normal; también se puede ejecutar **Validate portal** manualmente sobre la rama.

Para comprobar la fuente fuera de GitHub:

```powershell
npm run content:check
```

Sin cambios, no modifica la instantánea ni su fecha. Si la fuente vuelve al estado aceptado, retira una propuesta local obsoleta. Si falta el contenedor esperado, un área, un ID o un cuerpo de anuncio, falla de forma visible y conserva el catálogo publicado.

### Esquema editorial

Cada registro identifica el anuncio oficial mediante su `data-bon-entry`, no por el título traducido. `sourceHash` verifica la revisión contra cambios de fuente. `Mixto` significa que el anuncio agrupa capacidades en fases distintas; `Próximamente` no equivale a acceso disponible hoy.

La extracción utiliza los cuerpos originales de las entradas, excluye introducciones marcadas por Microsoft y no usa sus resúmenes automáticos. Admite anuncios en `h3` y `h4`. No inventa anchors: si el encabezado no tiene uno, enlaza al Book of News y muestra el título original. Los enlaces de ampliación proceden de la propia fuente.

## Marca y privacidad

La referencia de marca se conserva **solo en local** en la carpeta ignorada `tdsynnex-customizacion/`. El sitio utiliza Arial y colores derivados de la guía; no distribuye fuentes comerciales. El SVG suministrado se mantiene sin modificaciones sobre fondo blanco.

Publicar únicamente contenido público y activos autorizados. No añadir nombres de clientes, planes internos o información confidencial al catálogo. La aplicación no necesita ningún fichero `.env`.

## Estado de verificación

Los comandos locales permiten verificar catálogo, tipos, build, búsqueda, favoritos, presentación, responsive y subruta Pages. Los workflows remotos, apertura real de PR y URL pública solo pueden verificarse después de crear el repositorio, autorizar Actions y habilitar Pages.

El aviso de auditoría de `picomatch` afecta a herramientas de desarrollo transitivas; el registro consultado no ofrece una versión corregida. No se envían patrones glob del usuario a estas herramientas y no se incluyen en el bundle público. Revisar `npm audit` y actualizar cuando exista corrección; no aplicar downgrades automáticos que rompan la cadena de herramientas.
