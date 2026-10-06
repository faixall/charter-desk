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
header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
header nav { display: flex; gap: 4px; margin-right: auto; }
header nav a { padding: 8px 10px; border-radius: 8px; color: var(--muted); text-decoration: none; font-weight: 600; }
header nav a.on { color: var(--text); background: var(--bg); }
main { max-width: 720px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.35rem; margin: 4px 0 16px; }
a { color: var(--accent); }
.btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 16px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-text); }
.btn.danger { color: var(--danger); }
.btn.block { width: 100%; }
.tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; }
.tabs a { padding: 8px 14px; border-radius: 999px; border: 1px solid var(--border); text-decoration: none; color: var(--text); white-space: nowrap; }
.tabs a.on { background: var(--text); color: var(--bg); border-color: var(--text); }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
a.card { display: block; color: inherit; text-decoration: none; }
.row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
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
.hint { font-size: .88rem; color: var(--muted); margin-top: 6px; min-height: 1.2em; }
`

const NAV = [
  ['/', 'Home'],
  ['/calendar', 'Calendar'],
  ['/bookings', 'Bookings'],
] as const

export type Section = 'home' | 'calendar' | 'bookings'

export function Layout(props: { title: string; section?: Section; children: Child }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${props.title} · Charter Desk`}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <header>
          <nav>
            {NAV.map(([href, label]) => (
              <a href={href} class={label.toLowerCase() === props.section ? 'on' : ''}>
                {label}
              </a>
            ))}
          </nav>
          <a class="btn primary" href="/bookings/new">+ New</a>
        </header>
        <main>{props.children}</main>
      </body>
    </html>
  )
}
