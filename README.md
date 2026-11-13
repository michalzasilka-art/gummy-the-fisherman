# Gummy the Fisherman

A fishing party game for learning English. Players take turns filling the gap in a sentence: right answers reel the fish in, wrong ones let it pull Gummy towards the water. After every round each player gets one try at the **catch bar**: tap **CATCH!** while the fish swims through the net. Better answers make the net wider. At the end the fish go on the scale, and the most points wins.

- Modes: Solo, Team and 6 players, plus Phone mode (players answer on their phones).
- Three places, each with its own fish, junk and catch bar art: Glimmerwater Lake, Frostfall Lake and Sapphire Sea.
- A Fish Index of every fish you have caught.

**Play it:** https://www.fugio.co/fish/

**Version: v21** (13 Nov 2026, steady catch bar with confetti). The version counts only changes to Gummy, not to the rest of fugio.co. See [CHANGELOG.md](CHANGELOG.md).

This repository is a snapshot of the live Production files on fugio.co. The live site is still deployed from the fugio-site folder with the Vercel CLI, not from this repository.

## What is here

| Path | What it is |
| --- | --- |
| `gummy-fisherman-copy/index.html` | The whole game: one hand-written HTML file, no build step |
| `gummy-fisherman-copy/packages.js` | The question packages (made by `tools/build-packages.js`, don't edit by hand) |
| `gummy-fisherman-copy/art/` | Backgrounds, UI and catch bar art (`art/catchbar/` = per-place bar, net, posts, fish, button ring and corner ornaments) |
| `gummy-fisherman-copy/fish/` | Fish and junk pictures |
| `gummy-fisherman-copy/video/` | Gummy's reactions, catch clips and the player profile loops |
| `shared/pack-picker.js` | The question package picker shared by the fugio.co games |
| `notes/gummy-the-fisherman/` | The game's notes pages (fugio.co/notes/gummy-the-fisherman/) |
| `api/gummy.js` | The Fish Index API (`/api/gummy`, Vercel Blob). It runs on bitta.net; on fugio.co the call returns 404 and the game keeps the index in the browser |
| `tools/build-packages.js` | Turns the gap-fill content JSON into `packages.js` |

## Run it locally

Serve the repository root with any static server and open the game folder:

```bash
npx serve .
```

Then open http://localhost:3000/gummy-fisherman-copy/. For testing, `?dev=<rarity>` (e.g. `?dev=mythical`) forces that fish rarity and `?dev=weigh` jumps straight to the end-of-game scale. The game loads `/shared/pack-picker.js` from the root, so serve the root, not the game folder.

## Rebuild the question packages

```bash
node tools/build-packages.js en-grammar-gap-fill-sample.json gummy-fisherman-copy/packages.js
```

Libraries loaded from CDNs: jsPDF 2.5.1, PeerJS 1.5.4, qrcode-generator 1.4.4, plus Google Fonts (Fredoka, Lilita One, Nunito).

## Phone version
`gummy-fisherman-mobile/` is the solo phone and tablet game at https://www.fugio.co/gummy-fisherman-mobile/ (Foxino fishes; remade on 7 Nov 2026). `client.html` in that folder is the old phone app, still used as the client for Production's Phone mode (`?join=` links).
