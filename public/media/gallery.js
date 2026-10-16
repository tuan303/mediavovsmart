import { t, getLanguage } from './i18n.js?v=vercel-cms-20261016';
import { GALLERY_EN } from './gallery-translations.js?v=vercel-cms-20261016';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CATALOG_URL = new URL('./api/catalog', import.meta.url);
const CONTACT_SHEET_URL = new URL('./assets/contact-sheet.jpg', import.meta.url);
const COLLATOR = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** A comparable filename stem, independent of accents, extension and separators. */
export function normalizeName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\.(?:jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?|arw|cr2|cr3|nef|dng)$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeSearch(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
}

/** Read a year, or a YYYY-MM-DD / YYYYMMDD / YYYY Month DD date from a filename. */
export function parseFilenameDate(filename = '') {
  const text = String(filename);
  const compact = text.match(/(?:^|[^\d])((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/);
  const match = compact || text.match(/(?:^|[^\d])((?:19|20)\d{2})(?!\d)/);
  if (!match) return { year: null, month: null, day: null, sortKey: 0, precision: 'unknown' };
  const year = Number(match[1]);
  let month = compact ? Number(compact[2]) : null;
  let day = compact ? Number(compact[3]) : null;
  if (!compact) {
    const tail = text.slice(match.index + match[0].length);
    const numeric = tail.match(/^[\s_.-]+(\d{1,2})(?:[\s_.-]+(\d{1,2}))?(?=$|[^\d])/);
    const named = tail.match(/^[\s_.-]+([a-z]+)(?:[\s_.-]+(\d{1,2}))?(?=$|[^\d])/i);
    if (numeric) {
      month = Number(numeric[1]);
      day = numeric[2] ? Number(numeric[2]) : null;
    } else if (named) {
      const index = MONTH_NAMES.findIndex(name => name === named[1].toLowerCase() || name.slice(0, 3) === named[1].toLowerCase());
      if (index >= 0) {
        month = index + 1;
        day = named[2] ? Number(named[2]) : null;
      }
    }
  }
  if (month !== null && (month < 1 || month > 12)) {
    month = null;
    day = null;
  }
  if (day !== null && (day < 1 || day > new Date(Date.UTC(year, month || 1, 0)).getUTCDate())) {
    // An invalid complete date is treated as a year; never invent a day.
    month = null;
    day = null;
  }
  return {
    year, month, day,
    sortKey: year * 10000 + (month || 0) * 100 + (day || 0),
    precision: day ? 'day' : month ? 'month' : 'year',
  };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function yearLabel(year) {
  return year === null ? t('Giao lưu kết nối') : String(year);
}

function dateForEntry(entry) {
  const parsed = parseFilenameDate(entry.filename);
  if (!Object.hasOwn(entry, 'year')) return parsed;
  if (entry.year === null) return { year: null, month: null, day: null, sortKey: 0, precision: 'unknown' };
  const year = Number(entry.year);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return parsed;
  return parsed.year === year ? parsed : { year, month: null, day: null, sortKey: year * 10000, precision: 'year' };
}

function titleFromFilename(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/^(?:19|20)\d{2}(?:[-_. ]\d{1,2}){0,2}[-_. ]*/, '').replace(/[_]+/g, ' ').trim() || filename;
}

function galleryError(template, params = {}) {
  const error = new Error(t(template, params));
  error.translationKey = template;
  error.translationParams = params;
  return error;
}

function errorText(error, fallback = 'Không thể đọc hoặc lưu tệp.') {
  return t(error?.translationKey || fallback, error?.translationParams || {});
}

function displayField(entry, field) {
  const value = getLanguage() === 'en' ? entry[`${field}_en`] || entry[field] : entry[field];
  return typeof value === 'string' ? t(value) : '';
}

export class MediaGallery {
  constructor(options = {}) {
    this.options = options;
    this.catalog = [];
    this.entries = [];
    this.loading = true;
    this.initError = null;
    this.filters = { year: 'all', category: 'all', search: '', sort: 'desc' };
    this.filtered = [];
    this.activeId = null;
    this.events = new AbortController();
    this.dom = Object.fromEntries([
      'year-nav', 'category-nav', 'search-input', 'sort-select', 'gallery-grid', 'gallery-count', 'gallery-status',
      'reset-filters', 'media-dialog', 'lightbox-visual', 'lightbox-title', 'lightbox-filename',
      'lightbox-meta', 'lightbox-notice', 'lightbox-prev', 'lightbox-next', 'lightbox-download', 'lightbox-index',
    ].map(id => [id, document.getElementById(id)]));
    if (!this.dom['gallery-grid']) throw galleryError('Không tìm thấy khu vực thư viện ảnh.');
  }

  async init() {
    this.bindEvents();
    this.setStatus('Đang tải thư viện…');
    const catalogPromise = this.options.catalog
      ? Promise.resolve(this.options.catalog)
      : fetch(this.options.catalogURL || CATALOG_URL, { cache: 'no-cache' }).then(response => {
        if (!response.ok) throw galleryError('Không tải được danh mục ảnh ({status}).', { status: response.status });
        return response.json().then(payload => payload.entries);
      });
    try {
      const catalog = await catalogPromise;
      if (!Array.isArray(catalog)) throw galleryError('Danh mục ảnh không đúng định dạng.');
      this.catalog = catalog.filter(entry => entry && typeof entry.filename === 'string').map((entry, index) => ({
        ...entry,
        id: String(entry.id || `catalog-${index}`),
        title: String(entry.title || titleFromFilename(entry.filename)),
        category: String(entry.category || 'Khác'),
        location: String(entry.location || ''),
      }));
      this.loading = false;
      this.rebuildEntries();
      this.renderFilterOptions();
      this.render();
      return this;
    } catch (error) {
      this.loading = false;
      this.initError = error;
      this.renderLoadError();
      return this;
    }
  }

  bindEvents() {
    const on = (node, type, callback) => node?.addEventListener(type, callback, { signal: this.events.signal });
    on(document, 'languagechange', () => {
      if (this.loading) {
        this.setStatus('Đang tải thư viện…');
      } else if (this.initError) {
        this.renderLoadError();
      } else {
        this.rebuildEntries();
        this.renderFilterOptions();
        this.render();
        if (this.activeId) this.lightboxTrigger = [...this.dom['gallery-grid'].querySelectorAll('[data-media-id]')].find(button => button.dataset.mediaId === this.activeId) || this.lightboxTrigger;
      }
    });
    on(this.dom['year-nav'], 'click', event => {
      const button = event.target.closest('button[data-year]');
      if (button) this.setFilter('year', button.dataset.year);
    });
    on(this.dom['category-nav'], 'click', event => {
      const button = event.target.closest('button[data-category]');
      if (button) this.setFilter('category', button.dataset.category);
    });
    on(this.dom['search-input'], 'input', event => this.setFilter('search', event.target.value));
    on(this.dom['sort-select'], 'change', event => this.setFilter('sort', event.target.value === 'asc' ? 'asc' : 'desc'));
    on(this.dom['reset-filters'], 'click', () => this.resetFilters());
    on(this.dom['gallery-grid'], 'click', event => {
      const button = event.target.closest('[data-media-id]');
      if (button) this.openLightbox(button.dataset.mediaId, button);
      if (event.target.closest('[data-reset-gallery]')) this.resetFilters();
    });
    on(this.dom['lightbox-prev'], 'click', () => this.moveLightbox(-1));
    on(this.dom['lightbox-next'], 'click', () => this.moveLightbox(1));
    on(this.dom['media-dialog'], 'keydown', event => {
      if (event.target.matches('input, textarea, select')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.moveLightbox(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    for (const dialog of [this.dom['media-dialog']]) {
      on(dialog, 'click', event => {
        if (event.target.closest('[data-close]')) dialog.close();
        if (event.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
        }
      });
      on(dialog, 'close', () => {
        if (dialog === this.dom['media-dialog']) {
          this.activeId = null;
          this.lightboxTrigger?.focus({ preventScroll: true });
        }
      });
    }
  }

  rebuildEntries() {
    this.entries = this.catalog.map(entry => this.prepareEntry(entry));
  }

  prepareEntry(entry) {
    const date = dateForEntry(entry);
    let url = null;
    let storage = 'preview';
    if (typeof entry.src === 'string' && entry.src.trim()) {
      try {
        const resolved = new URL(entry.src, new URL('.', import.meta.url));
        if (['http:', 'https:'].includes(resolved.protocol)) {
          url = resolved.href;
          storage = 'hosted';
        }
      } catch { /* A missing source falls back to the archive placeholder. */ }
    }
    let downloadURL = url;
    if (typeof entry.downloadSrc === 'string' && entry.downloadSrc.trim()) {
      try {
        const resolved = new URL(entry.downloadSrc, new URL('.', import.meta.url));
        if (['http:', 'https:'].includes(resolved.protocol)) downloadURL = resolved.href;
      } catch {
        // The visible original remains available when an optional download URL is invalid.
      }
    }
    return {
      ...entry,
      year: date.year,
      date,
      storage,
      original: storage !== 'preview',
      url,
      downloadURL,
      originalFilename: storage === 'hosted' ? entry.filename : null,
      displayTitle: displayField(entry, 'title'),
      displayLocation: displayField(entry, 'location'),
      displaySourceNotice: displayField(entry, 'sourceNotice'),
      searchText: normalizeSearch([entry.title, entry.title_en, entry.filename, entry.category, GALLERY_EN[entry.category], entry.location, entry.location_en, date.year].filter(Boolean).join(' ')),
    };
  }

  renderFilterOptions() {
    const yearNav = this.dom['year-nav'];
    if (yearNav) {
      const fragment = document.createDocumentFragment();
      const years = [...new Set(this.entries.map(entry => entry.year))].sort((a, b) => (b ?? -Infinity) - (a ?? -Infinity));
      const makeButton = (value, label) => {
        const button = element('button', 'year-button', label);
        button.type = 'button';
        button.dataset.year = value;
        button.setAttribute('aria-pressed', 'false');
        return button;
      };
      fragment.append(makeButton('all', t('Tất cả')));
      for (const year of years) fragment.append(makeButton(year === null ? 'unknown' : String(year), yearLabel(year)));
      yearNav.replaceChildren(fragment);
    }
    const categoryNav = this.dom['category-nav'];
    if (categoryNav) {
      const categories = [...new Set(this.entries.map(entry => entry.category))];
      if (!categoryNav.querySelector('[data-category]')) {
        const all = element('button', 'filter-chip');
        const label = element('span', '', t('Tất cả hình ảnh'));
        label.dataset.categoryLabel = '';
        all.append(label);
        all.type = 'button';
        all.dataset.category = 'all';
        categoryNav.append(all);
      }
      for (const category of categories) {
        const existing = [...categoryNav.querySelectorAll('[data-category]')].some(button => button.dataset.category === category);
        if (!existing) {
          const button = element('button', 'filter-chip');
          const label = element('span', '', t(category));
          label.dataset.categoryLabel = '';
          button.append(label);
          button.type = 'button';
          button.dataset.category = category;
          button.dataset.generated = 'true';
          categoryNav.append(button);
        }
      }
      for (const button of categoryNav.querySelectorAll('[data-generated]')) {
        if (!categories.includes(button.dataset.category)) button.remove();
      }
      for (const button of categoryNav.querySelectorAll('[data-category]')) {
        let label = button.querySelector('[data-category-label]');
        if (!label) {
          label = element('span');
          label.dataset.categoryLabel = '';
          for (const node of [...button.childNodes]) if (node.nodeType === 3) node.remove();
          button.append(label);
        }
        label.textContent = t(button.dataset.category === 'all' ? 'Tất cả hình ảnh' : button.dataset.category);
      }
    }
    if (this.filters.year !== 'all' && !this.entries.some(entry => (entry.year === null ? 'unknown' : String(entry.year)) === this.filters.year)) this.filters.year = 'all';
    if (this.filters.category !== 'all' && !this.entries.some(entry => entry.category === this.filters.category)) this.filters.category = 'all';
    this.updateFilterControls();
  }

  setFilter(name, value) {
    this.filters[name] = value;
    this.render();
  }

  resetFilters() {
    this.filters = { year: 'all', category: 'all', search: '', sort: 'desc' };
    if (this.dom['search-input']) this.dom['search-input'].value = '';
    if (this.dom['sort-select']) this.dom['sort-select'].value = 'desc';
    this.render();
  }

  updateFilterControls() {
    for (const button of this.dom['year-nav']?.querySelectorAll('[data-year]') || []) {
      const active = button.dataset.year === this.filters.year;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
      button.classList.toggle('selected', active);
    }
    for (const button of this.dom['category-nav']?.querySelectorAll('[data-category]') || []) {
      const active = button.dataset.category === this.filters.category;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('is-active', active);
      button.classList.toggle('selected', active);
    }
    const reset = this.dom['reset-filters'];
    if (reset) reset.hidden = this.filters.year === 'all' && this.filters.category === 'all' && !this.filters.search.trim() && this.filters.sort === 'desc';
  }

  getFiltered() {
    const query = normalizeSearch(this.filters.search.trim());
    return this.entries.filter(entry => (
      (this.filters.year === 'all' || (entry.year === null ? 'unknown' : String(entry.year)) === this.filters.year)
      && (this.filters.category === 'all' || entry.category === this.filters.category)
      && (!query || query.split(/\s+/).every(word => entry.searchText.includes(word)))
    )).sort((a, b) => {
      if (a.year === null && b.year !== null) return 1;
      if (b.year === null && a.year !== null) return -1;
      const comparison = a.date.sortKey - b.date.sortKey || COLLATOR.compare(a.filename, b.filename);
      return this.filters.sort === 'asc' ? comparison : -comparison;
    });
  }

  render() {
    this.filtered = this.getFiltered();
    this.updateFilterControls();
    const visible = this.filtered;
    const fragment = document.createDocumentFragment();
    let currentYear;
    let yearGrid;
    for (const entry of visible) {
      if (currentYear !== entry.year || !yearGrid) {
        currentYear = entry.year;
        const section = element('section', 'year-group');
        section.dataset.year = entry.year === null ? 'unknown' : String(entry.year);
        const heading = element('div', 'year-heading');
        const title = element('h3', 'year-title', yearLabel(entry.year));
        title.id = `gallery-year-${entry.year === null ? 'unknown' : entry.year}`;
        section.setAttribute('aria-labelledby', title.id);
        const total = this.filtered.filter(item => item.year === entry.year).length;
        heading.append(title, element('span', 'year-count', t('{count} tư liệu', { count: total })));
        yearGrid = element('div', 'year-grid');
        section.append(heading, yearGrid);
        fragment.append(section);
      }
      yearGrid.append(this.renderCard(entry));
    }
    if (!visible.length) {
      const empty = element('div', 'gallery-empty');
      const reset = element('button', 'button button-primary', t('Xóa bộ lọc'));
      reset.type = 'button';
      reset.dataset.resetGallery = '';
      empty.append(element('h3', '', t('Chưa tìm thấy tư liệu phù hợp')), element('p', '', t('Thử một năm khác, đổi từ khóa hoặc xóa bộ lọc để xem toàn bộ thư viện.')), reset);
      fragment.append(empty);
    }
    this.dom['gallery-grid'].replaceChildren(fragment);
    if (this.dom['gallery-count']) this.dom['gallery-count'].textContent = t('{count} tư liệu trong thư viện', { count: this.filtered.length });
    this.setStatus(this.filtered.length ? 'Đang hiển thị {visible} / {total} tư liệu' : 'Không có tư liệu phù hợp với bộ lọc.', { visible: visible.length, total: this.filtered.length });
    if (this.activeId && this.dom['media-dialog']?.open) this.updateLightbox();
  }

  renderCard(entry) {
    const card = element('article', 'media-card');
    card.dataset.id = entry.id;
    const button = element('button', 'image-media');
    button.type = 'button';
    button.dataset.mediaId = entry.id;
    button.setAttribute('aria-label', t('Xem {title}, {year}', { title: entry.displayTitle, year: yearLabel(entry.year) }));
    button.append(this.renderVisual(entry));
    const badge = element('span', entry.original ? 'preview-badge original-badge' : 'preview-badge', t(entry.original ? 'Ảnh gốc' : 'Ảnh xem trước'));
    const action = element('span', 'media-open-icon', '↗');
    action.setAttribute('aria-hidden', 'true');
    button.append(badge, action);
    const body = element('div', 'media-card-body');
    const meta = element('div', 'media-card-meta');
    if (yearLabel(entry.year) !== t(entry.category)) {
      meta.append(element('span', 'media-year', yearLabel(entry.year)), element('span', 'media-category', t(entry.category)));
    } else {
      meta.append(element('span', 'media-year', t(entry.category)));
    }
    body.append(meta, element('h4', 'media-card-title', entry.displayTitle));
    if (entry.displayLocation) body.append(element('p', 'media-card-location', entry.displayLocation));
    card.append(button, body);
    return card;
  }

  renderVisual(entry) {
    if (entry.original && entry.url) {
      const image = element('img', 'media-photo');
      image.alt = entry.displayTitle;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        const placeholder = element('div', 'media-placeholder media-error', t('Chưa tải được ảnh. Bạn vẫn có thể mở ảnh gốc qua liên kết trong phần chi tiết.'));
        placeholder.setAttribute('role', 'img');
        placeholder.setAttribute('aria-label', t('Chưa tải được ảnh {title}. Liên kết ảnh gốc vẫn có trong phần chi tiết.', { title: entry.displayTitle }));
        image.replaceWith(placeholder);
      }, { once: true });
      image.src = entry.url;
      return image;
    }
    if (Array.isArray(entry.rect) && entry.rect.length === 4 && entry.rect.every(Number.isFinite)) {
      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.classList.add('media-preview');
      svg.setAttribute('viewBox', entry.rect.join(' '));
      svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', t('{title} — ảnh xem trước từ danh mục', { title: entry.displayTitle }));
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      const image = document.createElementNS(SVG_NS, 'image');
      const defs = document.createElementNS(SVG_NS, 'defs');
      const clip = document.createElementNS(SVG_NS, 'clipPath');
      const clipId = `clip-${entry.id}-${Math.random().toString(36).slice(2, 9)}`;
      clip.id = clipId;
      const rect = document.createElementNS(SVG_NS, 'rect');
      ['x', 'y', 'width', 'height'].forEach((name, index) => rect.setAttribute(name, String(entry.rect[index])));
      clip.append(rect);
      defs.append(clip);
      image.setAttribute('clip-path', `url(#${clipId})`);
      image.setAttribute('href', String(this.options.contactSheetURL || CONTACT_SHEET_URL));
      image.setAttribute('width', '1662');
      image.setAttribute('height', '876');
      svg.append(defs, image);
      return svg;
    }
    const placeholder = element('div', 'media-placeholder', t('Chưa có ảnh xem trước'));
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', t('Chưa có ảnh xem trước cho {title}', { title: entry.displayTitle }));
    return placeholder;
  }

  openLightbox(id, trigger) {
    const dialog = this.dom['media-dialog'];
    if (!dialog || !this.filtered.some(entry => entry.id === id)) return;
    this.activeId = id;
    this.lightboxTrigger = trigger || document.activeElement;
    this.updateLightbox();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-close]')?.focus({ preventScroll: true });
  }

  moveLightbox(step) {
    if (!this.activeId || !this.filtered.length) return;
    const index = this.filtered.findIndex(entry => entry.id === this.activeId);
    const nextIndex = Math.max(0, Math.min(this.filtered.length - 1, index + step));
    this.activeId = this.filtered[nextIndex].id;
    this.updateLightbox();
  }

  updateLightbox() {
    const index = this.filtered.findIndex(entry => entry.id === this.activeId);
    const entry = this.filtered[index];
    if (!entry) {
      this.dom['media-dialog']?.close();
      return;
    }
    const visual = this.renderVisual(entry);
    if (visual.tagName === 'IMG') visual.loading = 'eager';
    if (visual.tagName.toLowerCase() === 'svg') visual.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.dom['lightbox-visual']?.replaceChildren(visual);
    this.setText('lightbox-title', entry.displayTitle);
    this.setText('lightbox-filename', entry.originalFilename || entry.filename);
    this.setText('lightbox-meta', [...new Set([yearLabel(entry.year), t(entry.category), entry.displayLocation].filter(Boolean))].join(' · '));
    this.setText('lightbox-index', `${index + 1} / ${this.filtered.length}`);
    const notices = {
      local: 'Ảnh gốc đã nhập và lưu riêng trên trình duyệt này. Ảnh chưa được đăng tải lên máy chủ.',
      hosted: 'Ảnh gốc trong thư viện VOVSMART.',
      preview: 'Ảnh xem trước được trích từ danh mục bạn cung cấp. Nhập ảnh gốc cùng tên tệp để xem và tải ở chất lượng đầy đủ.',
    };
    const isRaw = entry.storage !== 'local' && String(entry.originalFormat || '').toUpperCase() === 'ARW';
    const sourceNotice = entry.displaySourceNotice.trim();
    const notice = entry.storage === 'local' ? notices.local : sourceNotice || (isRaw
      ? 'Ảnh xem trước từ tệp RAW gốc. Bạn có thể tải tệp RAW bằng liên kết bên dưới.'
      : notices[entry.storage] || notices.preview);
    this.setText('lightbox-notice', t(notice));
    if (this.dom['lightbox-prev']) this.dom['lightbox-prev'].disabled = index === 0;
    if (this.dom['lightbox-next']) this.dom['lightbox-next'].disabled = index === this.filtered.length - 1;
    const download = this.dom['lightbox-download'];
    if (download) {
      const originalURL = entry.downloadURL || (entry.original ? entry.url : null);
      const href = originalURL || String(this.options.contactSheetURL || CONTACT_SHEET_URL);
      const crossOrigin = Boolean(originalURL && entry.storage !== 'local' && new URL(href, import.meta.url).origin !== window.location.origin);
      download.href = href;
      download.textContent = t(originalURL
        ? isRaw ? 'Tải file RAW' : crossOrigin ? 'Mở ảnh gốc' : 'Tải ảnh gốc'
        : 'Xem danh mục gốc');
      if (originalURL && !crossOrigin) {
        download.download = entry.originalFilename || entry.filename;
        download.removeAttribute('target');
        download.removeAttribute('rel');
      } else {
        download.removeAttribute('download');
        download.target = '_blank';
        download.rel = 'noopener';
      }
    }
  }

  setText(id, text) {
    if (this.dom[id]) this.dom[id].textContent = text;
  }

  renderLoadError() {
    this.setStatus('Chưa tải được thư viện. Vui lòng tải lại trang để thử lại.');
    const empty = element('div', 'gallery-empty');
    empty.append(element('h3', '', t('Thư viện tạm thời chưa khả dụng')), element('p', '', errorText(this.initError, 'Chưa tải được thư viện. Vui lòng tải lại trang để thử lại.')));
    this.dom['gallery-grid'].replaceChildren(empty);
    this.setText('gallery-count', t('{count} tư liệu trong thư viện', { count: 0 }));
  }

  setStatus(template, params = {}) {
    this.setText('gallery-status', t(template, params));
  }

  get state() {
    return Object.freeze({
      ...this.filters,
      total: this.entries.length,
      filtered: this.filtered.length,
      visible: this.filtered.length,
      activeId: this.activeId,
    });
  }

  destroy() {
    this.events.abort();
  }
}

export async function initGallery(options = {}) {
  const gallery = new MediaGallery(options);
  await gallery.init();
  const debug = Object.freeze({
    get state() { return gallery.state; },
    parseFilenameDate,
    normalizeName,
  });
  Object.defineProperty(window, 'mediaGallery', { configurable: true, enumerable: false, get: () => debug });
  return gallery;
}
