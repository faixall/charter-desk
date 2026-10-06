import { raw } from 'hono/html'
import type { Child } from 'hono/jsx'

const css = `
:root {
  --bg: #f6f7f9; --surface: #fff; --text: #14181f; --muted: #5d6673; --border: #dde1e7;
  --accent: #0b6bcb; --accent-text: #fff; --warn-bg: #fff4d6; --warn-border: #e8b931;
  --danger: #c4321f; --ok: #1c7c3c;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1216; --surface: #181c22; --text: #e8ebef; --muted: #9aa3ae; --border: #2c323b;
    --accent: #4c9ef0; --accent-text: #0b1118; --warn-bg: #3a2f0c; --warn-border: #b18a1c;
    --danger: #f0735f; --ok: #5cc27e;
  }
}
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.45 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: var(--bg); color: var(--text); }
header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
header .brand { font-weight: 700; color: var(--text); text-decoration: none; margin-right: auto; }
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 1; display: grid; grid-template-columns: repeat(5, 1fr);
  background: var(--surface); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); }
.tabbar a { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 0 6px; font-size: .7rem; font-weight: 600;
  color: var(--muted); text-decoration: none; }
.tabbar a.on { color: var(--accent); }
main { max-width: 720px; margin: 0 auto; padding: 16px 16px calc(84px + env(safe-area-inset-bottom)); }
h1 { font-size: 1.35rem; margin: 4px 0 16px; }
a { color: var(--accent); }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; white-space: nowrap; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.btn.danger { color: var(--danger); }
.btn.block { width: 100%; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.tabs a { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); text-decoration: none; color: var(--text); white-space: nowrap; }
.tabs a.on { background: var(--text); color: var(--bg); border-color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
a.card { display: block; color: inherit; text-decoration: none; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.card.row { align-items: center; }
.muted { color: var(--muted); font-size: .92rem; }
.badge { font-size: .78rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--border); white-space: nowrap; }
.badge.requested { border-color: var(--accent); color: var(--accent); }
.badge.awaiting_payment { border-color: var(--warn-border); }
.badge.booked { border-color: var(--ok); color: var(--ok); }
.badge.declined, .badge.cancelled, .badge.expired { color: var(--muted); }
label { display: block; font-weight: 600; margin: 14px 0 6px; }
input, select, textarea { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; }
textarea { min-height: 80px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
.alert { background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
.alert.error { border-color: var(--danger); }
.actions { display: grid; gap: 10px; margin-top: 16px; }
.actions form { display: flex; gap: 8px; }
.actions form input { flex: 1; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; }
dt { color: var(--muted); }
dd { margin: 0; }
h2 { font-size: 1rem; margin: 24px 0 10px; display: flex; justify-content: space-between; align-items: baseline; }
h2 a { font-size: .9rem; font-weight: 600; }
.card.urgent { border-color: var(--danger); }
.reason { font-size: .88rem; font-weight: 600; margin-bottom: 4px; color: var(--accent); }
.card.urgent .reason { color: var(--danger); }
.weeknav { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.weeknav h1 { margin: 0 auto 0 0; font-size: 1.15rem; }
.weeknav .btn { min-height: 38px; padding: 0 12px; }
.day { margin-bottom: 14px; }
.day-head { display: flex; justify-content: space-between; font-size: .9rem; font-weight: 600; margin-bottom: 4px; }
.day-head a { text-decoration: none; }
.day.today .day-head span { color: var(--accent); }
.hours { position: relative; height: 16px; font-size: .7rem; color: var(--muted); margin-bottom: 4px; }
.hours span { position: absolute; transform: translateX(-50%); }
.hours span:first-child { transform: none; }
.hours span.last { transform: translateX(-100%); }
.tl { position: relative; height: 46px; border: 1px solid var(--border); border-radius: 8px; background-color: var(--surface);
  background-image: repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px calc(100% / var(--hours))); }
.blk { position: absolute; top: 4px; bottom: 4px; border-radius: 6px; padding: 3px 4px; overflow: hidden; white-space: nowrap;
  font-size: .75rem; font-weight: 600; line-height: 1.3; text-decoration: none; background: var(--accent); color: var(--accent-text); }
.blk span { display: block; overflow: hidden; text-overflow: ellipsis; }
.blk span:first-child { text-overflow: clip; letter-spacing: -.02em; }
.blk span + span { font-weight: 500; }
.blk.requested { background: var(--surface); border: 2px dashed var(--accent); color: var(--accent); }
.blk.awaiting_payment { background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--text); }
.blk.completed { opacity: .55; }
.legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: .8rem; color: var(--muted); margin-top: 8px; }
.legend i { display: inline-block; width: 14px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: middle; }
.btn.small { min-height: 34px; padding: 0 10px; font-size: .85rem; }
form.inline { display: flex; margin: 0 0 0 12px; }
.alert.ok { border-color: var(--ok); background: var(--surface); }
.md { display: grid; grid-template-columns: 4.5em 1fr; gap: 6px; }
.suggest { font-size: .88rem; color: var(--muted); margin-top: -2px; }
.row.net { border-top: 1px solid var(--border); margin-top: 8px; padding-top: 8px; font-size: 1.05rem; }
.neg { color: var(--danger); }
.catrow { margin-bottom: 10px; }
.bar { height: 6px; border-radius: 3px; background: var(--bg); overflow: hidden; margin-top: 4px; }
.bar i { display: block; height: 100%; border-radius: 3px; background: var(--accent); }
.bar i.cat-fuel { background: #d9822b; }
.bar i.cat-maintenance { background: #7a5af5; }
.bar i.cat-accessories { background: #1c9c8c; }
.bar i.cat-other { background: var(--muted); }
.hint { font-size: .88rem; color: var(--muted); margin-top: 6px; min-height: 1.2em; }
`

// Feather-style stroke icons, inline so there are no extra requests.
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  bookings: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  expenses: '<path d="M5 2.5h14v19l-3.5-2-3.5 2-3.5-2-3.5 2z"/><path d="M9 8h6M9 12h6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
} as const

export type Section = keyof typeof ICONS

const TABS: [Section, string, string][] = [
  ['home', '/', 'Home'],
  ['calendar', '/calendar', 'Calendar'],
  ['bookings', '/bookings', 'Bookings'],
  ['expenses', '/expenses', 'Expenses'],
  ['settings', '/settings', 'Settings'],
]

function Icon({ name }: { name: Section }) {
  // ICONS are static strings defined above, so emitting them unescaped is safe.
  return raw(
    `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`,
  )
}

export function Layout(props: { title: string; section?: Section; children: Child }) {
  // The header's + button adds whatever the current section is about.
  const add =
    props.section === 'expenses'
      ? { href: '/expenses/new', label: 'Expense' }
      : { href: '/bookings/new', label: 'Request' }
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{`${props.title} · Charter Desk`}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <header>
          <a class="brand" href="/">
            Charter Desk
          </a>
          <a class="btn primary" href={add.href}>
            + {add.label}
          </a>
        </header>
        <main>{props.children}</main>
        <nav class="tabbar">
          {TABS.map(([key, href, label]) => (
            <a href={href} class={key === props.section ? 'on' : ''} aria-current={key === props.section ? 'page' : undefined}>
              <Icon name={key} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </body>
    </html>
  )
}
