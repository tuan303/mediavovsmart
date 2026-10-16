import { initLanguage, pageText } from './i18n.js?v=vercel-cms-20261016';
import { initGallery } from './gallery.js?v=vercel-cms-20261016';

initLanguage();

const menuButton = document.getElementById('menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  menuButton.setAttribute('aria-label', pageText(open ? 'nav.open' : 'nav.close'));
  mobileNav.hidden = open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', pageText('nav.open'));
}));

document.querySelectorAll('[data-jump-year]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    document.getElementById('search-input').dispatchEvent(new Event('input'));
    document.querySelector('#category-nav [data-category="all"]')?.click();
    const yearButton = [...document.querySelectorAll('#year-nav button')].find(el => el.dataset.year === button.dataset.jumpYear || el.textContent.trim().startsWith(button.dataset.jumpYear));
    yearButton?.click();
    document.getElementById('thu-vien').scrollIntoView({ behavior: 'smooth' });
  });
});

initGallery().catch(error => {
  console.error('Không thể tải thư viện', error);
  document.getElementById('gallery-count').textContent = pageText('gallery.failure');
  const status = document.getElementById('gallery-status');
  status.textContent = pageText('gallery.retry');
});
