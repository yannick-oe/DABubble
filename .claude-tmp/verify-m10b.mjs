/**
 * M10b verification: 320px audit of every route, mobile menu/sheets/
 * settings/long-press flows as Noah, 375px spot-check, desktop 1920
 * regression as Elise. Headless Chrome against ng serve :4300.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4300';
const seed = JSON.parse(readFileSync('.claude-tmp/seed-ids.json', 'utf8'));
const CHANNEL_ID = seed.channels[0];

const NOAH = { email: 'test-noah@dabubble.dev', password: 'Test-Noah-2026!' };
const ELISE = { email: 'test-elise@dabubble.dev', password: 'Test-Elise-2026!' };

const results = [];
const consoleErrors = [];
const NOISE = /BloomFilter|heartbeats|Quota|net::ERR_ABORTED.*favicon/i;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

function report() {
  const failed = results.filter(r => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  const errs = consoleErrors.filter(e => !NOISE.test(e));
  console.log(errs.length ? `CONSOLE ERRORS:\n${errs.join('\n')}` : 'No console errors.');
}

process.on('uncaughtException', err => { console.error('CRASH', err); report(); process.exit(1); });
process.on('unhandledRejection', err => { console.error('CRASH', err); report(); process.exit(1); });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(page, fn, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(150);
  }
  return false;
}

async function noHScroll(page, label) {
  const data = await page.evaluate(() => ({
    inner: window.innerWidth,
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  check(`${label}: no horizontal scrollbar`, data.doc <= data.inner && data.body <= data.inner,
    `inner=${data.inner} doc=${data.doc} body=${data.body}`);
}

async function clickByText(page, selector, text) {
  return page.evaluate((sel, t) => {
    const el = [...document.querySelectorAll(sel)].find(e => e.textContent.trim().includes(t));
    if (!el) return false;
    el.click();
    return true;
  }, selector, text);
}

async function login(page, account) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('#login-email', { timeout: 15000 });
  await sleep(800);
  await page.evaluate(acc => {
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set('#login-email', acc.email);
    set('#login-password', acc.password);
  }, account);
  await sleep(400);
  await page.evaluate(() => document.querySelector('button[type="submit"]').click());
  await page.waitForFunction(() => location.pathname.startsWith('/app'), { timeout: 15000 });
}

async function longPress(page, selector) {
  const box = await (await page.$(selector)).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 40);
  const client = await page.createCDPSession();
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(700);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

async function sheetGeometry(page, cardSelector, label) {
  const data = await page.evaluate(sel => {
    const card = document.querySelector(sel);
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
      bottomGap: Math.abs(window.innerHeight - rect.bottom),
      width: rect.width, inner: window.innerWidth,
      radius: style.borderTopLeftRadius, bottomRadius: style.borderBottomLeftRadius,
    };
  }, cardSelector);
  check(`${label}: bottom sheet geometry`, !!data && data.bottomGap < 2 && Math.abs(data.width - data.inner) < 2
    && parseFloat(data.radius) > 0 && parseFloat(data.bottomRadius) === 0,
    data ? `gap=${data.bottomGap} w=${data.width}/${data.inner} r=${data.radius}/${data.bottomRadius}` : 'card missing');
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', err => consoleErrors.push(String(err)));
await page.setViewport({ width: 320, height: 660, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

/* A — public routes at 320px */
const publicRoutes = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/legal/imprint', '/legal/privacy'];
for (const route of publicRoutes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle2' });
  await sleep(600);
  await noHScroll(page, `320 ${route}`);
}

/* B — mobile app flows as Noah */
await login(page, NOAH);
await sleep(1200);

check('menu: brand logo shown', !!(await page.$('.topbar__brand-logo')));
check('menu: no Devspace tile / no back', !(await page.$('.topbar__workspace-name')) && !(await page.$('.topbar__back')));
const placeholder = await page.$eval('#topbar-search', el => el.placeholder).catch(() => null);
check('menu: search "Gehe zu..." in workspace column', placeholder === 'Gehe zu...');
check('menu: workspace head hidden', await page.$eval('.workspace__head', el => getComputedStyle(el).display === 'none'));
check('menu: FAB visible', !!(await page.$('.workspace__fab')));
const accent = await page.$eval('.workspace__item--mobile-accent img', el => el.getAttribute('src')).catch(() => null);
check('menu: blue add-channel row', accent === '/icons/add-circle-hover.svg');
await noHScroll(page, '320 /app menu');

/* create-channel bottom sheet: open, geometry, Escape, focus return */
await clickByText(page, '.workspace__item--mobile-accent', 'Channel hinzufügen');
await sleep(600);
await sheetGeometry(page, '.create-channel__dialog, .create-channel [class*="dialog"]', 'create-channel');
await noHScroll(page, '320 create-channel sheet');
await page.keyboard.press('Escape');
await sleep(400);
check('create-channel: Escape closes', !(await page.$('.create-channel')));
const focusBack = await page.evaluate(() => document.activeElement?.textContent?.includes('Channel hinzufügen') ?? false);
check('create-channel: focus returns to trigger', focusBack, await page.evaluate(() => document.activeElement?.className ?? 'none'));

/* scrim click closes */
await clickByText(page, '.workspace__item--mobile-accent', 'Channel hinzufügen');
await sleep(500);
await page.mouse.click(160, 30);
await sleep(400);
check('create-channel: scrim tap closes', !(await page.$('.create-channel')));

/* search: channel hit navigates */
await page.type('#topbar-search', 'M10b');
await waitFor(page, () => !!document.querySelector('.search-bar__option'));
await noHScroll(page, '320 search dropdown open');
const channelHit = await clickByText(page, '.search-bar__option', 'M10b');
check('search: channel hit listed', channelHit);
await waitFor(page, () => location.pathname.includes('/app/channel/'));
check('search: channel hit navigates', await page.evaluate(() => location.pathname.includes('/app/channel/')));
await sleep(1000);
check('chat view: back button shown', !!(await page.$('.topbar__back')));
await noHScroll(page, '320 channel view');

/* long-press on foreign message → quick reaction */
await waitFor(page, () => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('Mobiles Testen')));
const foreign = await page.evaluateHandle(() =>
  [...document.querySelectorAll('li.message')].find(m => m.textContent.includes('Mobiles Testen')));
await page.evaluate(el => el.scrollIntoView({ block: 'center' }), foreign);
await sleep(300);
const foreignId = await page.evaluate(el => el.id, foreign);
await longPress(page, `#${foreignId}`);
await sleep(300);
check('long-press: bar opens on held touch', await page.evaluate(id => document.getElementById(id)?.classList.contains('message--bar-open'), foreignId));
const barVisible = await page.evaluate(id => {
  const anchor = document.getElementById(id)?.querySelector('.message__actions-anchor');
  return anchor ? getComputedStyle(anchor).visibility !== 'hidden' && getComputedStyle(anchor).opacity !== '0' : false;
}, foreignId);
check('long-press: action bar visible', barVisible);
await page.evaluate(id => document.getElementById(id)?.querySelector('.actions__btn')?.click(), foreignId);
await waitFor(page, () => !!document.querySelector('.message .chip, app-reaction-chips button'), 6000);
check('long-press: quick reaction applied', await page.evaluate(id => !!document.getElementById(id)?.querySelector('app-reaction-chips'), foreignId));
check('long-press: bar closes after action', await page.evaluate(id => !document.getElementById(id)?.classList.contains('message--bar-open'), foreignId));

/* own message: send, long-press → edit, thread, delete */
await page.type('.composer__text', 'Eigene Nachricht Noah');
await page.click('.composer__send');
await waitFor(page, () => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('Eigene Nachricht Noah')));
const ownId = await page.evaluate(() =>
  [...document.querySelectorAll('li.message')].find(m => m.textContent.includes('Eigene Nachricht Noah'))?.id);
check('composer: own message sent', !!ownId);
await page.evaluate(id => document.getElementById(id)?.scrollIntoView({ block: 'center' }), ownId);
await sleep(300);
await longPress(page, `#${ownId}`);
await sleep(300);
await page.evaluate(id => document.getElementById(id)?.querySelector('[aria-label="Weitere Optionen"]')?.click(), ownId);
await sleep(300);
await clickByText(page, `#${ownId} .actions__menu-item`, 'bearbeiten');
await waitFor(page, () => !!document.querySelector('.message__edit-text'));
check('long-press: edit mode reachable', !!(await page.$('.message__edit-text')));
await page.evaluate(() => { const t = document.querySelector('.message__edit-text'); t.value = 'Eigene Nachricht Noah (editiert)'; t.dispatchEvent(new Event('input', { bubbles: true })); });
await clickByText(page, '.message__edit-actions button', 'Speichern');
await waitFor(page, () => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('(editiert)')));
check('long-press: edit saved', await page.evaluate(() => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('(editiert)'))));

/* thread via long-press bar */
await longPress(page, `#${ownId}`);
await sleep(300);
await page.evaluate(id => document.getElementById(id)?.querySelector('[aria-label="Thread starten"], [aria-label*="Thread"]')?.click(), ownId);
await waitFor(page, () => !!document.querySelector('.thread'));
check('long-press: thread opens', !!(await page.$('.thread')));
await noHScroll(page, '320 thread view');
await page.type('.thread .composer__text', 'Antwort mobil');
await page.click('.thread .composer__send');
await waitFor(page, () => [...document.querySelectorAll('.thread .message__bubble')].some(b => b.textContent.includes('Antwort mobil')));
check('thread: reply sent on mobile', await page.evaluate(() => [...document.querySelectorAll('.thread .message__bubble')].some(b => b.textContent.includes('Antwort mobil'))));
await page.click('[aria-label="Thread schließen"]');
await sleep(500);

/* delete for all via long-press */
await page.evaluate(id => document.getElementById(id)?.scrollIntoView({ block: 'center' }), ownId);
await sleep(200);
await longPress(page, `#${ownId}`);
await sleep(300);
await page.evaluate(id => document.getElementById(id)?.querySelector('[aria-label="Weitere Optionen"]')?.click(), ownId);
await sleep(300);
await clickByText(page, `#${ownId} .actions__menu-item`, 'löschen');
await sleep(300);
await clickByText(page, `#${ownId} .actions__menu-item`, 'alle');
await waitFor(page, () => [...document.querySelectorAll('.message__bubble--deleted')].length > 0);
check('long-press: delete-for-all tombstone', !!(await page.$('.message__bubble--deleted')));

/* settings sheet: mobile variant */
await page.click('.channel__title');
await waitFor(page, () => !!document.querySelector('.settings__head'));
await sleep(700);
await sheetGeometry(page, 'app-channel-settings-dialog .dialog-shell__card, app-channel-settings-dialog [class*="card"]', 'settings');
check('settings: icon buttons (pencil)', (await page.$$('.settings__icon-btn')).length >= 2);
check('settings: no text links on mobile', (await page.$$('.settings__link')).length === 0);
const memberRows = await page.$$eval('.settings__member', els => els.map(e => e.textContent.trim()));
check('settings: Mitglieder section embedded', memberRows.length >= 3, memberRows.join(' | '));
check('settings: self listed first with (Du)', memberRows[0]?.includes('(Du)') ?? false, memberRows[0]);
await noHScroll(page, '320 settings sheet');

/* rename: duplicate error then save via check icon */
await page.click('.settings__icon-btn');
await waitFor(page, () => !!document.querySelector('#settings-name'));
await page.evaluate(() => { const i = document.querySelector('#settings-name'); i.value = 'Just chatting'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.click('.settings__icon-btn');
await sleep(800);
const dupError = await page.$eval('#settings-name-error', el => el.textContent.trim()).catch(() => '');
check('settings: duplicate name inline error', dupError.length > 0, dupError);
await page.evaluate(() => { const i = document.querySelector('#settings-name'); i.value = 'M10b Umbenannt'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.click('.settings__icon-btn');
await waitFor(page, () => document.querySelector('.settings__title')?.textContent.includes('M10b Umbenannt'));
check('settings: rename saved via check icon', await page.evaluate(() => document.querySelector('.settings__title')?.textContent.includes('M10b Umbenannt')));

/* member row → profile sheet */
await page.evaluate(() => [...document.querySelectorAll('.settings__member')].find(m => m.textContent.includes('Test Elise'))?.click());
await waitFor(page, () => !!document.querySelector('app-profile-dialog'));
check('settings: member tap opens profile', !!(await page.$('app-profile-dialog')));
await page.keyboard.press('Escape');
await sleep(400);

/* add-members row → add sheet */
await page.click('.channel__title');
await waitFor(page, () => !!document.querySelector('.settings__member--add'));
await sleep(600);
await page.evaluate(() => document.querySelector('.settings__member--add').click());
await sleep(600);
const addOpen = await page.evaluate(() => document.body.textContent.includes('Leute hinzufügen') && !document.querySelector('.settings__head'));
check('settings: add row opens add-members sheet', addOpen);
await page.keyboard.press('Escape');
await sleep(400);

/* search: user hit opens profile from menu */
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2' });
await sleep(800);
await page.type('#topbar-search', 'Test Elise');
await waitFor(page, () => !!document.querySelector('.search-bar__option'));
await clickByText(page, '.search-bar__option', 'Test Elise');
await waitFor(page, () => !!document.querySelector('app-profile-dialog'));
check('search: user hit opens profile sheet', !!(await page.$('app-profile-dialog')));
await sleep(700);
await sheetGeometry(page, 'app-profile-dialog .dialog-shell__card, app-profile-dialog [class*="card"]', 'profile');
await page.keyboard.press('Escape');
await sleep(400);

/* search: message hit jumps + highlights */
await page.click('#topbar-search', { clickCount: 3 });
await page.type('#topbar-search', 'Mobiles Testen');
await waitFor(page, () => [...document.querySelectorAll('.search-bar__option')].some(o => o.textContent.includes('Mobiles Testen')));
await clickByText(page, '.search-bar__option', 'Mobiles Testen');
await waitFor(page, () => !!document.querySelector('.message--focus'));
check('search: message hit jumps with highlight', !!(await page.$('.message--focus')));

/* new-message via FAB */
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2' });
await sleep(800);
await page.click('.workspace__fab');
await waitFor(page, () => location.pathname.includes('new-message'));
check('FAB: opens new-message view', await page.evaluate(() => location.pathname.includes('new-message')));
await noHScroll(page, '320 new-message');
await page.type('#new-message-address', 'Test Elise');
await waitFor(page, () => !!document.querySelector('.suggestions__option, [class*="suggestion"] button'));
await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Test Elise') && b.closest('[class*="suggestion"]'))?.click());
await sleep(400);
await page.type('.composer__text', 'Hallo Elise vom Handy');
await page.click('.composer__send');
await waitFor(page, () => location.pathname.includes('/app/dm/'));
check('new-message: send navigates to DM', await page.evaluate(() => location.pathname.includes('/app/dm/')));
await waitFor(page, () => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('Hallo Elise vom Handy')));
check('new-message: DM message delivered', await page.evaluate(() => [...document.querySelectorAll('.message__bubble')].some(b => b.textContent.includes('Hallo Elise vom Handy'))));
await noHScroll(page, '320 DM view');

/* emoji pickers fit 320: composer picker + reaction picker on own message */
await page.evaluate(() => document.querySelector('.composer__tools .composer__tool')?.click());
await sleep(500);
const pickerBox = await page.evaluate(() => {
  const p = document.querySelector('app-emoji-picker');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return { left: r.left, right: r.right, inner: window.innerWidth };
});
check('320 composer emoji picker fits viewport', !!pickerBox && pickerBox.left >= 0 && pickerBox.right <= pickerBox.inner,
  pickerBox ? `l=${pickerBox.left} r=${pickerBox.right}` : 'not open');
await page.keyboard.press('Escape');
await sleep(300);
const dmOwnId = await page.evaluate(() =>
  [...document.querySelectorAll('li.message.message--own')].at(-1)?.id);
await page.evaluate(id => document.getElementById(id)?.scrollIntoView({ block: 'center' }), dmOwnId);
await sleep(200);
await longPress(page, `#${dmOwnId}`);
await sleep(300);
await page.evaluate(id => document.getElementById(id)?.querySelector('[aria-label="Emoji auswählen"]')?.click(), dmOwnId);
await sleep(500);
const reactionPickerBox = await page.evaluate(() => {
  const p = document.querySelector('app-emoji-picker');
  if (!p) return null;
  const r = p.getBoundingClientRect();
  return { left: r.left, right: r.right, inner: window.innerWidth };
});
check('320 reaction picker fits viewport (own message)', !!reactionPickerBox && reactionPickerBox.left >= 0 && reactionPickerBox.right <= reactionPickerBox.inner,
  reactionPickerBox ? `l=${reactionPickerBox.left} r=${reactionPickerBox.right}` : 'not open');
await page.keyboard.press('Escape');

/* leave channel (mobile button) */
await page.goto(`${BASE}/app/channel/${CHANNEL_ID}`, { waitUntil: 'networkidle2' });
await sleep(1000);
await page.click('.channel__title');
await waitFor(page, () => !!document.querySelector('.settings__actions button'));
await clickByText(page, '.settings__actions button', 'Channel verlassen');
await waitFor(page, () => !document.querySelector('.settings__head'), 10000);
await sleep(800);
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2' });
await sleep(1000);
check('settings: leave channel works', await page.evaluate(() => ![...document.querySelectorAll('.workspace__item')].some(i => i.textContent.includes('M10b'))));

/* C — 375px spot check */
await page.setViewport({ width: 375, height: 720, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle2' });
await sleep(800);
await noHScroll(page, '375 /app menu');
check('375: menu layout intact (FAB + search)', !!(await page.$('.workspace__fab')) && !!(await page.$('#topbar-search')));

/* D — desktop 1920 regression as Elise (separate browser) */
const desktopBrowser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const desk = await desktopBrowser.newPage();
desk.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[desktop] ${msg.text()}`); });
await desk.setViewport({ width: 1920, height: 1080 });
await login(desk, ELISE);
await sleep(1500);
check('desktop: workspace head visible', await desk.$eval('.workspace__head', el => getComputedStyle(el).display !== 'none').catch(() => false));
check('desktop: no FAB', !(await desk.$('.workspace__fab')));
check('desktop: no search bar inside workspace column', !(await desk.$('app-workspace-menu app-search-bar')));
const deskPlaceholder = await desk.$eval('#topbar-search', el => el.placeholder).catch(() => null);
check('desktop: search placeholder "Devspace durchsuchen"', deskPlaceholder === 'Devspace durchsuchen');
check('desktop: brand logo in topbar (desktop branch)', !!(await desk.$('.topbar__logo')));

await desk.goto(`${BASE}/app/channel/${CHANNEL_ID}`, { waitUntil: 'networkidle2' });
await sleep(1200);
const hoverTarget = await desk.evaluate(() => [...document.querySelectorAll('li.message')].find(m => m.textContent.includes('Mobiles Testen'))?.id);
if (hoverTarget) {
  await desk.hover(`#${hoverTarget}`);
  await sleep(300);
  const hoverBar = await desk.evaluate(id => {
    const a = document.getElementById(id)?.querySelector('.message__actions-anchor');
    return a ? getComputedStyle(a).visibility !== 'hidden' && getComputedStyle(a).opacity !== '0' : false;
  }, hoverTarget);
  check('desktop: hover action bar unchanged', hoverBar);
} else {
  check('desktop: hover action bar unchanged', false, 'seed message not found');
}
await desk.click('.channel__title');
await sleep(600);
check('desktop: settings uses text links (no icon buttons)', (await desk.$$('.settings__link')).length >= 2 && (await desk.$$('.settings__icon-btn')).length === 0);
check('desktop: no embedded Mitglieder card', (await desk.$$('.settings__member')).length === 0);
const deskSheet = await desk.evaluate(() => {
  const card = document.querySelector('app-channel-settings-dialog [class*="card"], app-channel-settings-dialog .dialog-shell__card');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  return { bottomGap: window.innerHeight - r.bottom };
});
check('desktop: settings NOT a bottom sheet', !!deskSheet && deskSheet.bottomGap > 50, deskSheet ? `gap=${deskSheet.bottomGap}` : 'card missing');

report();
await browser.close();
await desktopBrowser.close();
process.exit(0);
