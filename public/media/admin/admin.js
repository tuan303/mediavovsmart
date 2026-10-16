(() => {
  'use strict';
  const API = '/media/api/admin';
  const LANGUAGE_KEY = 'vovsmart-display-language';
  const $ = (id) => document.getElementById(id);
  const COPY = {
    en: {
      pageTitle: 'Media management — VOVSMART', skip: 'Skip to content', language: 'Display language', back: 'View website', logout: 'Sign out', welcome: 'Your stories.\nYour collection.', loginIntro: 'A dedicated workspace for the moments that shape the VOVSMART journey.', loginCaption: 'CURATE · CONNECT · SHARE', loginTitle: 'Manage the archive', loginDescription: 'Enter your access key to add, edit and organise photographs.', accessKey: 'Access key', signIn: 'Sign in', keyNote: 'Your access key is kept only for this open session.', workspace: 'MEDIA WORKSPACE', dashboardTitle: 'A collection worth sharing.', dashboardDescription: 'Add an image link, tell its story and place it in the timeline.', addMedia: 'Add media', photos: 'photos in the archive', sharedNote: 'Saved changes appear on the website for everyone.', search: 'Search titles, places or filenames…', filterYear: 'Year', refresh: 'Refresh', newestFirst: 'NEWEST FIRST', emptyTitle: 'No photographs found', emptyDescription: 'Try another search or choose a different year.', footer: 'Media archive · Management', editorEyebrow: 'THE NEXT CHAPTER', close: 'Close', previewPlaceholder: 'Your image will appear here', previewNote: 'Use a direct image link that anyone can open. The photograph remains hosted at its source.', imageUrl: 'Image URL', preview: 'Preview', urlHelp: 'Paste a direct HTTPS image URL.', existingUrlHelp: 'This archive image is stored with the website. Keep this path, or replace it with an HTTPS image URL.', year: 'Timeline year', noYear: 'No year · People & Connections', category: 'Theme', titleEn: 'Title in English', titleVi: 'Title in Vietnamese', locationEn: 'Location in English', locationVi: 'Location in Vietnamese', save: 'Save changes', saveNote: 'Saving updates the live collection.', cancel: 'Cancel', conflict: 'The collection has changed in another session. Your unsaved changes are still here. Reload the latest version before saving again.', reloadLatest: 'Reload latest version', deleteTitle: 'Remove this photo?', deleteDescription: 'It will be removed from the media archive. The original image at its source will stay unchanged.', delete: 'Delete', reloadTitle: 'Reload the collection?', reloadDescription: 'Any unsaved edits will be discarded and the latest saved version will be loaded.', keepEditing: 'Keep editing', reloadDiscard: 'Reload and discard edits', allYears: 'All years', connections: 'People & Connections', edit: 'Edit', editMedia: 'Edit media', resultCount: '{count} of {total} photos', resultCountOne: '{count} of {total} photos', saved: 'Your changes have been saved.', added: 'The photograph has been added to the archive.', deleted: 'The photograph has been removed from the archive.', refreshed: 'The latest collection is now loaded.', loading: 'Loading…', saving: 'Saving…', deleting: 'Deleting…', previewLoading: 'Loading image preview…', previewReady: 'Image preview is ready.', previewFailed: 'This image could not be loaded. Check that the link opens an image and is publicly accessible.', urlInvalid: 'Enter a complete HTTPS image URL without a username or password.', yearInvalid: 'Enter a whole year from 1900 to 2100, or select “No year”.', titleRequired: 'Please enter a title in both English and Vietnamese.', unauthorized: 'The access key is not valid. Please check it and try again.', sessionExpired: 'Your access key is no longer valid. Copy any unsaved edits, sign out and sign in with a valid key.', storageNotConfigured: 'Media storage is not connected yet. Configure shared storage before managing the collection.', networkError: 'Unable to connect. Check your connection and try again. Your unsaved changes are still here.', upstreamError: 'The storage service is temporarily unavailable. Please try again. Your unsaved changes are still here.', invalidEntry: 'Some details could not be saved. Check the image link, titles and year, then try again.', forbidden: 'This page could not verify the request. Open media management on the website and try again.', tooLarge: 'This update is too large. Shorten the image URL or text and try again.', genericError: 'The request could not be completed. Please try again.', deleteConflict: 'The collection has changed. Close this dialog and reload the latest version before deleting.', imageUnavailable: 'Image unavailable', discardTitle: 'Discard unsaved edits?', discardDescription: 'Your changes to this photograph have not been saved. Close the editor and discard them?', discard: 'Discard edits', missingEntry: 'This photo is no longer in the collection. Reload the latest version.', categoryCompany: 'VOVSMART Highlights', categoryInfrastructure: 'Infrastructure & Transport', categoryIndustry: 'Energy & Industry', categoryInternational: 'International Connections', categoryConnections: 'People & Connections', categoryOther: 'Other', adminNotConfigured: 'Admin access is not configured yet. Set a secure access key before managing the collection.'
    },
    vi: {
      pageTitle: 'Quản lý media — VOVSMART', skip: 'Đến nội dung chính', language: 'Ngôn ngữ hiển thị', back: 'Xem website', logout: 'Đăng xuất', welcome: 'Câu chuyện của bạn.\nBộ sưu tập của bạn.', loginIntro: 'Không gian lưu giữ và chia sẻ những khoảnh khắc trên hành trình VOVSMART.', loginCaption: 'LƯU GIỮ · KẾT NỐI · CHIA SẺ', loginTitle: 'Quản lý thư viện', loginDescription: 'Nhập khóa truy cập để thêm, chỉnh sửa và sắp xếp hình ảnh.', accessKey: 'Khóa truy cập', signIn: 'Đăng nhập', keyNote: 'Khóa truy cập chỉ được giữ trong phiên đang mở này.', workspace: 'KHÔNG GIAN QUẢN LÝ MEDIA', dashboardTitle: 'Những khoảnh khắc đáng chia sẻ.', dashboardDescription: 'Chèn đường dẫn ảnh, thêm câu chuyện và gán vào mốc thời gian.', addMedia: 'Thêm ảnh', photos: 'ảnh trong thư viện', sharedNote: 'Thay đổi đã lưu sẽ hiển thị trên website cho mọi người.', search: 'Tìm tiêu đề, địa điểm hoặc tên tệp…', filterYear: 'Năm', refresh: 'Làm mới', newestFirst: 'MỚI NHẤT TRƯỚC', emptyTitle: 'Không tìm thấy hình ảnh', emptyDescription: 'Thử từ khóa khác hoặc chọn một năm khác.', footer: 'Thư viện media · Quản lý', editorEyebrow: 'VIẾT TIẾP HÀNH TRÌNH', close: 'Đóng', previewPlaceholder: 'Ảnh của bạn sẽ hiển thị tại đây', previewNote: 'Dùng đường dẫn trực tiếp đến ảnh mà mọi người đều mở được. Ảnh được lưu trữ tại nguồn ban đầu.', imageUrl: 'Đường dẫn ảnh', preview: 'Xem trước', urlHelp: 'Dán đường dẫn HTTPS trực tiếp đến ảnh.', existingUrlHelp: 'Ảnh tư liệu này được lưu cùng website. Giữ nguyên đường dẫn hoặc thay bằng đường dẫn ảnh HTTPS.', year: 'Năm trên dòng thời gian', noYear: 'Không có năm · Giao lưu kết nối', category: 'Chủ đề', titleEn: 'Tiêu đề tiếng Anh', titleVi: 'Tiêu đề tiếng Việt', locationEn: 'Địa điểm tiếng Anh', locationVi: 'Địa điểm tiếng Việt', save: 'Lưu thay đổi', saveNote: 'Lưu để cập nhật thư viện trên website.', cancel: 'Hủy', conflict: 'Thư viện đã được thay đổi trong một phiên khác. Nội dung bạn chưa lưu vẫn được giữ nguyên. Vui lòng tải bản mới nhất trước khi lưu tiếp.', reloadLatest: 'Tải phiên bản mới nhất', deleteTitle: 'Xóa ảnh này?', deleteDescription: 'Ảnh sẽ được gỡ khỏi thư viện media. Tệp ảnh gốc tại nguồn vẫn được giữ nguyên.', delete: 'Xóa', reloadTitle: 'Tải lại thư viện?', reloadDescription: 'Nội dung chỉnh sửa chưa lưu sẽ bị bỏ qua và phiên bản đã lưu mới nhất sẽ được tải lại.', keepEditing: 'Tiếp tục chỉnh sửa', reloadDiscard: 'Bỏ chỉnh sửa và tải lại', allYears: 'Tất cả các năm', connections: 'Giao lưu kết nối', edit: 'Sửa', editMedia: 'Chỉnh sửa ảnh', resultCount: '{count} / {total} ảnh', resultCountOne: '{count} / {total} ảnh', saved: 'Đã lưu thay đổi của bạn.', added: 'Đã thêm ảnh vào thư viện.', deleted: 'Đã xóa ảnh khỏi thư viện.', refreshed: 'Đã tải phiên bản thư viện mới nhất.', loading: 'Đang tải…', saving: 'Đang lưu…', deleting: 'Đang xóa…', previewLoading: 'Đang tải ảnh xem trước…', previewReady: 'Ảnh đã sẵn sàng để xem trước.', previewFailed: 'Không tải được ảnh. Kiểm tra đường dẫn có mở trực tiếp hình ảnh và cho phép truy cập công khai hay không.', urlInvalid: 'Nhập đường dẫn ảnh HTTPS đầy đủ, không chứa tên đăng nhập hoặc mật khẩu.', yearInvalid: 'Nhập năm nguyên từ 1900 đến 2100 hoặc chọn “Không có năm”.', titleRequired: 'Vui lòng nhập tiêu đề bằng cả tiếng Anh và tiếng Việt.', unauthorized: 'Khóa truy cập không hợp lệ. Vui lòng kiểm tra và thử lại.', sessionExpired: 'Khóa truy cập không còn hợp lệ. Sao chép nội dung chưa lưu, đăng xuất và đăng nhập lại bằng khóa hợp lệ.', storageNotConfigured: 'Chưa kết nối kho lưu trữ media. Cần thiết lập kho lưu trữ dùng chung để quản lý thư viện.', networkError: 'Không thể kết nối. Kiểm tra mạng và thử lại. Nội dung chưa lưu vẫn được giữ nguyên.', upstreamError: 'Dịch vụ lưu trữ tạm thời không khả dụng. Vui lòng thử lại. Nội dung chưa lưu vẫn được giữ nguyên.', invalidEntry: 'Một số thông tin chưa được lưu. Kiểm tra đường dẫn ảnh, tiêu đề và năm rồi thử lại.', forbidden: 'Không xác minh được yêu cầu. Mở trang quản lý media từ website rồi thử lại.', tooLarge: 'Nội dung cập nhật quá lớn. Rút ngắn đường dẫn ảnh hoặc văn bản rồi thử lại.', genericError: 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.', deleteConflict: 'Thư viện đã thay đổi. Đóng hộp thoại và tải phiên bản mới nhất trước khi xóa.', imageUnavailable: 'Ảnh không khả dụng', discardTitle: 'Bỏ thay đổi chưa lưu?', discardDescription: 'Thay đổi của ảnh này chưa được lưu. Đóng trình chỉnh sửa và bỏ các thay đổi?', discard: 'Bỏ thay đổi', missingEntry: 'Ảnh này không còn trong thư viện. Vui lòng tải phiên bản mới nhất.', categoryCompany: 'Dấu ấn VOVSMART', categoryInfrastructure: 'Hạ tầng & giao thông', categoryIndustry: 'Năng lượng & công nghiệp', categoryInternational: 'Kết nối quốc tế', categoryConnections: 'Giao lưu kết nối', categoryOther: 'Khác', adminNotConfigured: 'Chưa thiết lập quyền quản trị. Cần cấu hình khóa truy cập an toàn để quản lý thư viện.'
    }
  };
  const CATEGORIES = [
    ['Dấu ấn VOVSMART', 'categoryCompany'], ['Hạ tầng & giao thông', 'categoryInfrastructure'],
    ['Năng lượng & công nghiệp', 'categoryIndustry'], ['Kết nối quốc tế', 'categoryInternational'], ['Giao lưu kết nối', 'categoryConnections'], ['Khác', 'categoryOther']
  ];
  let language = 'en';
  try { language = localStorage.getItem(LANGUAGE_KEY) === 'vi' ? 'vi' : 'en'; } catch { /* Private browsing may disable storage. */ }
  const state = { key: '', entries: [], revision: null, busy: false, conflict: false, editing: null, deleting: null, initialForm: '', previewSequence: 0, previewUrl: '', previewValid: false, reloadMode: 'reload' };
  const messages = new Map();
  const t = (key, values = {}) => (COPY[language][key] || COPY.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
  const text = (entry, field) => language === 'en' ? entry[`${field}_en`] || entry[field] || '' : entry[field] || entry[`${field}_en`] || '';
  const normalise = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  function message(id, key, values = {}) {
    const target = $(id);
    if (!key) { messages.delete(id); target.textContent = ''; target.hidden = true; return; }
    messages.set(id, { key, values }); target.textContent = t(key, values); target.hidden = false;
  }
  function applyLanguage() {
    document.documentElement.lang = language;
    document.title = t('pageTitle');
    document.querySelectorAll('[data-copy]').forEach((node) => { node.textContent = t(node.dataset.copy); });
    document.querySelectorAll('[data-label]').forEach((node) => { node.setAttribute('aria-label', t(node.dataset.label)); });
    document.querySelectorAll('[data-placeholder]').forEach((node) => { node.placeholder = t(node.dataset.placeholder); });
    document.querySelectorAll('[data-lang]').forEach((node) => node.setAttribute('aria-pressed', String(node.dataset.lang === language)));
    for (const [id, value] of messages) $(id).textContent = t(value.key, value.values);
    const selected = $('media-category').value;
    $('media-category').replaceChildren(...CATEGORIES.map(([value, key]) => new Option(t(key), value)));
    if (selected) $('media-category').value = selected;
    $('editor-title').textContent = t(state.editing ? 'editMedia' : 'addMedia');
    $('url-help').textContent = t(state.editing?.src?.startsWith('assets/') ? 'existingUrlHelp' : 'urlHelp');
    if (state.deleting) $('delete-name').textContent = text(state.deleting, 'title');
    updateReloadText();
    renderYears();
    renderList();
    updateBusyControls();
  }
  function setBusy(busy) {
    state.busy = busy;
    document.querySelectorAll('form, #dashboard').forEach((node) => node.setAttribute('aria-busy', String(busy)));
    updateBusyControls();
  }
  function updateBusyControls() {
    document.querySelectorAll('button:not([data-lang]), input, select').forEach((node) => { node.disabled = state.busy; });
    $('media-year').disabled = state.busy || $('no-year').checked;
    $('save-media').disabled = state.busy || state.conflict;
    $('confirm-delete').disabled = state.busy || state.conflict;
    $('login-submit').textContent = t(state.busy && !$('login-panel').hidden ? 'loading' : 'signIn');
    $('save-media').textContent = t(state.busy && $('editor-dialog').open ? 'saving' : 'save');
    $('confirm-delete').textContent = t(state.busy && $('delete-dialog').open ? 'deleting' : 'delete');
  }
  async function request(method = 'GET', payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(API, { method, headers: { Authorization: `Bearer ${state.key}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
      let data;
      try { data = await response.json(); } catch { throw Object.assign(new Error('invalid_response'), { status: response.status }); }
      if (!response.ok) throw Object.assign(new Error(data.error?.code || 'request_failed'), { status: response.status });
      if (!Array.isArray(data.entries) || data.revision == null) throw new Error('invalid_response');
      return data;
    } finally { clearTimeout(timer); }
  }
  function errorKey(error, isLogin = false) {
    if (error.status === 401) return isLogin ? 'unauthorized' : 'sessionExpired';
    if (error.message === 'admin_not_configured') return 'adminNotConfigured';
    if (error.status === 503) return 'storageNotConfigured';
    if (error.status === 502) return 'upstreamError';
    if (error.status === 403) return 'forbidden';
    if (error.status === 413) return 'tooLarge';
    if (error.status === 400) return 'invalidEntry';
    if (error instanceof TypeError || error.name === 'AbortError') return 'networkError';
    return 'genericError';
  }
  function acceptCatalog(data) {
    state.entries = data.entries; state.revision = data.revision; state.conflict = false;
    $('dashboard-conflict').hidden = true; $('editor-conflict').hidden = true;
    renderYears(); renderList();
  }
  function markConflict() {
    state.conflict = true;
    $('dashboard-conflict').hidden = false;
    $('editor-conflict').hidden = !$('editor-dialog').open;
    if ($('delete-dialog').open) message('delete-error', 'deleteConflict');
    updateBusyControls();
  }
  function renderYears() {
    const selected = $('filter-year').value || 'all';
    const years = [...new Set(state.entries.filter((entry) => entry.year != null).map((entry) => Number(entry.year)))].sort((a, b) => b - a);
    const options = [new Option(t('allYears'), 'all'), ...years.map((year) => new Option(String(year), String(year)))];
    if (state.entries.some((entry) => entry.year == null)) options.push(new Option(t('connections'), 'none'));
    $('filter-year').replaceChildren(...options);
    $('filter-year').value = options.some((option) => option.value === selected) ? selected : 'all';
  }
  function resolveImage(src) {
    try {
      if (typeof src !== 'string') return '';
      if (src.startsWith('assets/') && !src.includes('..')) return new URL(src, `${location.origin}/media/`).href;
      const url = new URL(src);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function makeElement(tag, className, content) {
    const node = document.createElement(tag); if (className) node.className = className; if (content != null) node.textContent = content; return node;
  }
  function renderList() {
    const query = normalise($('search-media').value).trim();
    const year = $('filter-year').value;
    const entries = state.entries.filter((entry) => {
      const yearMatches = year === 'all' || (year === 'none' ? entry.year == null : String(entry.year) === year);
      return yearMatches && (!query || normalise([entry.title, entry.title_en, entry.location, entry.location_en, entry.filename, entry.year].join(' ')).includes(query));
    }).sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
    const fragment = document.createDocumentFragment();
    for (const entry of entries) {
      const card = makeElement('article', 'media-row');
      const image = makeElement('img', 'row-image'); image.src = resolveImage(entry.src); image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'strict-origin-when-cross-origin';
      image.addEventListener('error', () => { image.alt = t('imageUnavailable'); });
      const info = makeElement('div', 'row-info'); info.append(makeElement('h2', '', text(entry, 'title')), makeElement('p', '', text(entry, 'location') || entry.filename || ''));
      const meta = makeElement('div', 'row-meta'); meta.append(makeElement('span', 'year-badge', entry.year == null ? t('connections') : String(entry.year)), makeElement('span', 'row-theme', t(CATEGORIES.find(([value]) => value === entry.category)?.[1] || 'categoryOther')));
      const actions = makeElement('div', 'row-actions');
      const edit = makeElement('button', '', t('edit')); edit.type = 'button'; edit.setAttribute('aria-label', `${t('edit')}: ${text(entry, 'title')}`); edit.disabled = state.busy; edit.addEventListener('click', () => openEditor(entry));
      const remove = makeElement('button', 'delete-action', t('delete')); remove.type = 'button'; remove.setAttribute('aria-label', `${t('delete')}: ${text(entry, 'title')}`); remove.disabled = state.busy; remove.addEventListener('click', () => openDelete(entry));
      actions.append(edit, remove); card.append(image, info, meta, actions); fragment.append(card);
    }
    $('media-list').replaceChildren(fragment);
    $('total-count').textContent = String(state.entries.length);
    $('result-count').textContent = t('resultCount', { count: entries.length, total: state.entries.length });
    $('empty-state').hidden = entries.length > 0;
  }
  function formSnapshot() {
    return JSON.stringify(['image-url', 'media-year', 'media-category', 'title-en', 'title-vi', 'location-en', 'location-vi'].map((id) => $(id).value).concat($('no-year').checked));
  }
  function openEditor(entry = null) {
    if (state.busy) return;
    state.editing = entry; state.previewUrl = ''; state.previewValid = false; state.previewSequence++;
    $('media-form').reset();
    $('image-url').value = entry?.src || '';
    $('media-year').value = entry?.year ?? (entry ? '' : new Date().getFullYear());
    $('no-year').checked = !!entry && entry.year == null;
    $('media-category').value = entry?.category || 'Dấu ấn VOVSMART';
    $('title-en').value = entry?.title_en || '';
    $('title-vi').value = entry?.title || '';
    $('location-en').value = entry?.location_en || '';
    $('location-vi').value = entry?.location || '';
    $('editor-title').textContent = t(entry ? 'editMedia' : 'addMedia');
    $('url-help').textContent = t(entry?.src?.startsWith('assets/') ? 'existingUrlHelp' : 'urlHelp');
    $('image-preview').hidden = true; $('image-preview').removeAttribute('src'); $('preview-placeholder').hidden = false;
    message('preview-status', null); message('editor-error', null); $('editor-conflict').hidden = !state.conflict;
    state.initialForm = formSnapshot();
    updateBusyControls(); $('editor-dialog').showModal();
    if (entry?.src) previewImage();
    else $('image-url').focus();
  }
  function closeEditor(force = false) {
    if (state.busy) return;
    if (!force && formSnapshot() !== state.initialForm) { state.reloadMode = 'discard'; updateReloadText(); $('reload-dialog').showModal(); return; }
    state.previewSequence++; $('editor-dialog').close(); state.editing = null; state.initialForm = '';
  }
  function urlIsValid() {
    const value = $('image-url').value.trim();
    return !!value && (state.editing && value === state.editing.src && !!resolveImage(value) || (() => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } })());
  }
  async function previewImage() {
    const raw = $('image-url').value.trim();
    const sequence = ++state.previewSequence;
    state.previewValid = false; state.previewUrl = raw;
    $('preview-status').classList.remove('is-error');
    $('image-preview').hidden = true; $('preview-placeholder').hidden = false;
    if (!raw) { message('preview-status', null); return false; }
    if (!urlIsValid()) { message('preview-status', 'urlInvalid'); $('preview-status').classList.add('is-error'); return false; }
    message('preview-status', 'previewLoading');
    const url = resolveImage(raw);
    return new Promise((resolve) => {
      const probe = new Image();
      const timer = setTimeout(() => finish(false), 15000);
      let settled = false;
      function finish(ok) {
        if (settled) return; settled = true; clearTimeout(timer); probe.onload = null; probe.onerror = null;
        if (sequence !== state.previewSequence) { resolve(false); return; }
        state.previewValid = ok;
        if (ok) { $('image-preview').src = url; $('image-preview').alt = $('title-en').value || $('title-vi').value || ''; $('image-preview').hidden = false; $('preview-placeholder').hidden = true; message('preview-status', 'previewReady'); }
        else { message('preview-status', 'previewFailed'); $('preview-status').classList.add('is-error'); }
        resolve(ok);
      }
      probe.onload = () => finish(probe.naturalWidth > 0); probe.onerror = () => finish(false); probe.src = url;
    });
  }
  function readEntry() {
    const src = $('image-url').value.trim();
    const entry = {
      src, year: $('no-year').checked ? null : Number($('media-year').value), category: $('media-category').value,
      title: $('title-vi').value.trim(), title_en: $('title-en').value.trim(), location: $('location-vi').value.trim(), location_en: $('location-en').value.trim()
    };
    if (!state.editing || src !== state.editing.src) { entry.downloadSrc = src; entry.sourceUrl = src; }
    return entry;
  }
  function openDelete(entry) {
    state.deleting = entry; $('delete-name').textContent = text(entry, 'title'); message('delete-error', state.conflict ? 'deleteConflict' : null); updateBusyControls(); $('delete-dialog').showModal();
  }
  function updateReloadText() {
    const discard = state.reloadMode === 'discard';
    $('reload-title').textContent = t(discard ? 'discardTitle' : 'reloadTitle');
    $('reload-title').nextElementSibling.textContent = t(discard ? 'discardDescription' : 'reloadDescription');
    $('confirm-reload').textContent = t(discard ? 'discard' : 'reloadDiscard');
  }
  async function reloadCatalog() {
    setBusy(true); message('dashboard-error', null);
    try {
      const data = await request(); acceptCatalog(data);
      $('reload-dialog').close(); $('editor-dialog').close(); $('delete-dialog').close();
      state.editing = null; state.deleting = null; state.previewSequence++;
      message('dashboard-status', 'refreshed');
    } catch (error) {
      $('reload-dialog').close();
      message($('editor-dialog').open ? 'editor-error' : 'dashboard-error', errorKey(error));
    } finally { setBusy(false); }
  }
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (state.busy) return;
    state.key = $('access-key').value.trim(); $('access-key').value = ''; message('login-error', null); setBusy(true);
    $('login-submit').textContent = t('loading');
    try {
      const data = await request(); acceptCatalog(data);
      $('login-panel').hidden = true; $('dashboard').hidden = false; $('logout').hidden = false;
      $('dashboard-title').tabIndex = -1; $('dashboard-title').focus();
    } catch (error) { state.key = ''; message('login-error', errorKey(error, true)); }
    finally { setBusy(false); }
  });
  $('logout').addEventListener('click', () => {
    if (state.busy) return;
    state.key = ''; state.entries = []; state.revision = null; state.editing = null; state.deleting = null; state.conflict = false; state.previewSequence++;
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    $('login-panel').hidden = false; $('dashboard').hidden = true; $('logout').hidden = true;
    $('access-key').value = ''; $('media-form').reset(); $('search-media').value = ''; $('media-list').replaceChildren();
    for (const id of [...messages.keys()]) message(id, null);
    $('dashboard-conflict').hidden = true; $('editor-conflict').hidden = true; $('access-key').focus();
  });
  document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => {
    language = button.dataset.lang; try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Language changes still work without persistence. */ } applyLanguage();
  }));
  $('search-media').addEventListener('input', renderList);
  $('filter-year').addEventListener('change', renderList);
  $('add-media').addEventListener('click', () => openEditor());
  $('preview-button').addEventListener('click', previewImage);
  $('image-url').addEventListener('change', previewImage);
  $('image-url').addEventListener('input', () => { state.previewValid = false; state.previewSequence++; });
  $('no-year').addEventListener('change', () => { $('media-year').disabled = $('no-year').checked; if ($('no-year').checked) $('media-category').value = 'Giao lưu kết nối'; });
  $('cancel-editor').addEventListener('click', () => closeEditor());
  $('close-editor').addEventListener('click', () => closeEditor());
  $('editor-dialog').addEventListener('cancel', (event) => { event.preventDefault(); if (!state.busy) closeEditor(); });
  $('delete-dialog').addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
  $('reload-dialog').addEventListener('cancel', (event) => { if (state.busy) event.preventDefault(); });
  $('cancel-delete').addEventListener('click', () => { $('delete-dialog').close(); state.deleting = null; });
  $('cancel-reload').addEventListener('click', () => $('reload-dialog').close());
  $('refresh-media').addEventListener('click', () => { if (state.conflict) { state.reloadMode = 'reload'; updateReloadText(); $('reload-dialog').showModal(); } else reloadCatalog(); });
  document.querySelectorAll('.reload-latest').forEach((button) => button.addEventListener('click', () => { state.reloadMode = 'reload'; updateReloadText(); $('reload-dialog').showModal(); }));
  $('confirm-reload').addEventListener('click', () => { if (state.reloadMode === 'discard') { $('reload-dialog').close(); closeEditor(true); } else reloadCatalog(); });
  $('media-form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (state.busy || state.conflict) return;
    message('editor-error', null);
    if (!urlIsValid()) { message('editor-error', 'urlInvalid'); $('image-url').focus(); return; }
    const entry = readEntry();
    if (entry.year !== null && (!$('media-year').value.trim() || !Number.isInteger(entry.year) || entry.year < 1900 || entry.year > 2100)) { message('editor-error', 'yearInvalid'); $('media-year').focus(); return; }
    if (!entry.title || !entry.title_en) { message('editor-error', 'titleRequired'); (!entry.title_en ? $('title-en') : $('title-vi')).focus(); return; }
    const editing = state.editing;
    setBusy(true);
    try {
      // Existing archive metadata remains editable even if its source is temporarily offline.
      if ((!editing || entry.src !== editing.src) && !(state.previewValid && state.previewUrl === entry.src)) {
        if (!await previewImage()) { message('editor-error', 'previewFailed'); return; }
      }
      const data = await request(editing ? 'PATCH' : 'POST', { ...(editing ? { id: editing.id } : {}), entry, revision: state.revision });
      acceptCatalog(data); $('editor-dialog').close(); state.editing = null; state.previewSequence++;
      message('dashboard-status', editing ? 'saved' : 'added'); message('dashboard-error', null);
    } catch (error) { if (error.status === 409) markConflict(); else message('editor-error', errorKey(error)); }
    finally { setBusy(false); }
  });
  $('confirm-delete').addEventListener('click', async () => {
    if (state.busy || state.conflict || !state.deleting) return;
    setBusy(true); message('delete-error', null);
    try {
      const data = await request('DELETE', { id: state.deleting.id, revision: state.revision });
      acceptCatalog(data); $('delete-dialog').close(); state.deleting = null; message('dashboard-status', 'deleted'); message('dashboard-error', null);
    } catch (error) { if (error.status === 409) markConflict(); else message('delete-error', errorKey(error)); }
    finally { setBusy(false); }
  });
  window.addEventListener('beforeunload', (event) => {
    if ($('editor-dialog').open && state.initialForm !== formSnapshot()) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => { state.key = ''; $('access-key').value = ''; });
  window.addEventListener('pageshow', (event) => { if (event.persisted && !state.key) { setBusy(false); $('logout').click(); } });
  applyLanguage();
})();
