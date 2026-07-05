# Pakistan Policy Quest — From Interest to Impact

A story-driven, interactive research-idea development game for Master's students of
economics, public policy, and development studies in Pakistan. Players never get asked
"what is your research interest" — their choices across five acts (field vignettes, a
data bazaar, a duel with a skeptical Secretary) build a profile, and the game delivers a
**complete, thesis-ready research proposal**: research question, real Pakistani datasets
with access routes, a causal identification strategy with equations and assumptions,
threats and mitigations, a 12-month plan, ethics, and extensions.

**Built by [Saqib](https://itssaqib.github.io)** · engine & content assembled with Claude (Anthropic).

## What's in the box

```
index.html      Landing page
play.html       The game
vault.html      Browsable reference: 11 datasets, 6 methods, 21 designs
css/style.css   Design system ("field register" aesthetic)
js/data.js      ALL content: datasets, methods, scenes, questions, 21 designs  ← edit me
js/engine.js    Game engine (state, inference, proposal builder, exports)
js/ai.js        Optional AI layer (supervisor chat, proposal tailoring)
```

## Host it on GitHub Pages (free, ~3 minutes)

1. Create a new repository on GitHub (e.g. `policy-quest`), public.
2. Upload **all files and folders** in this bundle to the repository root
   (drag-and-drop works: *Add file → Upload files*).
3. Repository **Settings → Pages → Build and deployment**:
   Source = *Deploy from a branch*, Branch = `main`, Folder = `/ (root)`. Save.
4. Wait ~1 minute. Your site is live at `https://<username>.github.io/policy-quest/`.

No build step, no server, no dependencies.

## Run it locally

Unzip and double-click `index.html`. Everything except the AI layer and web fonts
works fully offline.

## The AI supervisor (optional)

The game is complete without AI. With AI enabled you additionally get:

- your free-text answers read by a language model instead of keyword matching;
- **"Tailor this proposal to my trail"** — a sharpened title, personalized motivation,
  two custom sub-questions, and an extra threat/mitigation;
- a **supervisor chat** that has read the generated proposal and answers viva-style
  questions about it.

To enable: click **⚙ AI** in the game and paste an Anthropic API key
(from console.anthropic.com). The key is stored **only in that browser's localStorage**
and sent **only to api.anthropic.com** — the site has no server and never sees it.
Usage is billed to the key's owner; a full playthrough costs a few cents on
`claude-sonnet-4-6` (default), less on `claude-haiku-4-5`.
Never commit an API key to the repository.

(Running the files inside Claude.ai? AI calls may work with no key at all.)

## Customize it

- **Content** — everything students see lives in `js/data.js`: add a dataset to `DATA`,
  a vignette to `SCENES`, or a full research design to `THEMES.<theme>.designs`
  (copy an existing design object; every field is used).
- **Credits** — the "Built by Saqib" lines live in the footers of the three HTML files,
  in `index.html`'s credit block, and in the proposal footer inside `js/engine.js`.
- **Data vintages** — dataset years are stated as of early/mid-2026; update `DATA`
  entries as PBS/DHS release new rounds.

## Notes for instructors

Assign one playthrough + exported proposal as a first-week research-methods exercise;
students defend their design in class. `vault.html` doubles as a standing reference
shelf for Pakistani microdata. State is per-browser and per-session — students should
**export (Download .md / Print PDF) before closing the tab**.

## License

Suggested: MIT for code, CC-BY 4.0 for content. Add a LICENSE file of your choice.
