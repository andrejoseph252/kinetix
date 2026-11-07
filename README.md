# Kinetix

A phone-first strength & conditioning web app: plan generator, workout player with logging, interval/rest timers, guided mobility flows and an exercise library with reference photos. No build step, no backend — static files that run on GitHub Pages and work offline.

## Deploy to GitHub Pages

```bash
cd Kinetix
git init && git add . && git commit -m "Kinetix"
gh repo create kinetix --public --source=. --push   # or create the repo on github.com and push
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
The app will be at `https://<your-username>.github.io/kinetix/`.

**On your iPhone:** open that URL in Safari → Share → **Add to Home Screen**. It then opens full-screen like an app.
In Settings (gear icon) tap **Save all exercise photos offline** once so the library works without signal.

## Run locally

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## How the plan works

- **6-week block:** weeks 1–2 *Re-entry* (RPE 6–7), weeks 3–5 *Build* (more sets and load, RPE 7–8), week 6 *Deload*. Exercises stay the same across the block; sets, reps and rest change each week.
- **Every strength session:** warm-up → power (jumps / throws / ballistics) → A superset (main lower + upper) → B superset (single-leg/lateral + upper + core) → conditioning finisher → cool-down stretches. 30-min sessions drop the finisher; 60-min sessions add accessories and carries.
- **Splits:** 2 days = Full Body A/B · 3 = Squat & Push / Hinge & Pull / Athletic Single-Leg · 4 adds Mobility & Recovery · 5 adds an Engine (conditioning) day.
- **Programs:** Athletic S&C, Push / Pull / Legs, Upper / Lower, Full Body, or *Build my own* (blank days), 2–6 days a week. **Workouts → Edit plan** lets you rename, reorder, duplicate, delete or replace days, and add days from blank, My workouts or any focus. Exercises you add to a plan day get the weekly progression automatically.
- **Style:** *Keep it simple*, *Kettlebell first*, *Classic gym* or *Mixed* weights which exercises get picked. Every exercise can be swapped for an alternative that fits your equipment.

## Layout

- **Today** — a mobility routine picked for the time of day, your next plan session, quick picks, and this week at a glance.
- **Workouts** — everything you can run: your plan, the last generated session, My workouts. Filter by category; generate or build blank.
- **Mobility** — routines grouped Morning / Anytime / Evening / Target an area, loaded-mobility sessions, and a custom flow builder. Customise any routine to save and edit it.
- **Faith** — your daily rule of life (Morning Offering, Scripture, Rosary, Examen, Mass, Confession… or your own), a guided Rosary (mysteries by day, Scripture, fruits, prayers — bring your own beads), a five-step Examen with a journal, NABRE reading plans (links to bible.usccb.org), intentions, a prayer library and the liturgical season/feast of the day. Customise practices with the gear icon.
- **Progress** (minutes by category, faith this week, 4-week calendar, history). The exercise **Library**, Timer and Settings are the icons top-right (Library is also on Workouts).

Colours mark categories everywhere: lime strength, yellow athletic, blue kettlebell, coral conditioning, teal mobility, violet recovery.

## One-off sessions & editing

- **Train tab → One-off session:** pick a focus (Strength & Power, Mobility & Control, Kettlebell, Athletic, Engine, Lower, Upper, Recovery), time, energy and today's equipment. The session is sized to the time you pick. Shuffle the whole thing or a single block.
- **Blocks have formats:** Sets (straight / superset), Circuit (rounds of A→B→C), Follow-along (timed flow), EMOM, Intervals, AMRAP, Note.
- **Edit anything** (pencil icon): rename, add/remove/reorder blocks, change a block's format, rounds and rest, add exercises (or your own custom ones), and per exercise set sets, reps / time / distance, per side, pause, tempo and a note. Works on plan days too, and mid-workout.
- **My workouts:** save any session (or build one from scratch) to reuse it.
- Every exercise has a **Watch demos** link to a YouTube Shorts search.

## Files

| Path | What |
|---|---|
| `index.html`, `css/app.css` | Shell and styles |
| `js/core.js` | Constants, categories/colours, state, audio |
| `js/engine.js` | Plan + one-off session generators, dosing, mobility routines |
| `js/views.js` | Screens: Today, Workouts, Mobility, Library, Progress, session view |
| `js/player.js` | Workout player, rest bar, interval/flow runner |
| `js/editor.js`, `js/actions.js`, `js/main.js` | Editing sheets, tap actions, boot |
| `js/data.js` | Exercise library (generated — don't hand-edit) |
| `img/ex/` | Exercise photos, normalised to one greyscale style |
| `tools/build_data.py` | Curated exercise list + cues; rebuilds `data.js` and photos |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline + home-screen install |

### Editing exercises

Exercises, tags, default doses and coaching cues live in `tools/build_data.py`. Edit, then run `python3 tools/build_data.py` (macOS — uses `sips` for images).

**Missing photos:** 14 moves aren't in the source database (90/90 Hip Switch, Bird Dog, Cossack Squat, Pigeon, Kettlebell Halo, etc.) and show a placeholder. To add your own, save `img/custom/<exercise-id>-0.jpg` (start position) and `-1.jpg` (end position) and rerun the script — they get the same greyscale treatment. List the IDs with:

```bash
python3 -c "import json;s=open('js/data.js').read();[print(e['id']) for e in json.loads(s[s.index('['):s.rindex(']')+1]) if not e['img']]"
```

After changing app files, bump `VERSION` in `sw.js` so installed copies pick up the update.

## Data

Everything is stored in your browser's localStorage on the device. Use **Export backup** in Settings occasionally — clearing Safari website data wipes it.

## Credits

Exercise photos (incl. machines, cables and isolation work) and base instructions: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense / public domain).
