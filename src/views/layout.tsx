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
header a.brand { font-weight: 700; color: var(--text); text-decoration: none; margin-right: auto; }
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
.hint { font-size: .88rem; color: var(--muted); margin-top: 6px; min-height: 1.2em; }
`

export function Layout(props: { title: string; children: Child }) {
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
          <a class="brand" href="/bookings">Charter Desk</a>
          <a class="btn primary" href="/bookings/new">+ New request</a>
        </header>
        <main>{props.children}</main>
      </body>
    </html>
  )
}
