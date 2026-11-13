# Gummy the Fisherman – Versions

Only changes to Gummy the Fisherman count here. Changes to the rest of fugio.co (the home page, the library and the other games) never change Gummy's version.

- **Up to v18**, each version is one day on which the Production game (fugio.co/fish) was published with changes. The list was rebuilt from the project's change log and the Vercel deploy history.
- **From v19 on**, every publish of the Gummy game gets the next number.

## v21 – 13 Nov 2026 · Steady catch bar, confetti on a catch
- Tapping CATCH! stops the fish exactly where it is on screen, and that spot decides the catch. Before, the game re-worked out the fish's position for the moment of the tap (up to 50 ms of swimming), so the fish jumped. A caught fish also used to jump and spin; now it stays still. A missed fish waits a moment before it swims off.
- A catch bursts the same confetti as a right answer, from the fish and from the player's CATCH! button.

## v20 – 13 Nov 2026 · Lobby icons for each place, faster catch bar
- The How to play and Fish Index buttons next to Start fishing have new painted icons (made in ChatGPT), one pair per place. How to play is always a little book and the Fish Index always a fish: a bobber and a jumping lake fish at Glimmerwater Lake, a snowflake and a frosty fish at Frostfall Lake, a lighthouse and an angelfish at Sapphire Sea. They are in `gummy-fisherman-copy/art/icons/`; the old line drawings stay as a fallback.
- The catch bar after each round is much quicker. Before it opens: 0.12 s (was 0.45 s). Before each fish starts: 0.2 s (was 0.7 s). After each try: 0.5 s (was 1.2 s), with the same confetti as a right answer. The summary: 0.9 s (was 1.9 s). The fish's speed and the time to tap did not change.

## v19 – 7 Nov 2026 · New phone version with Foxino
- The phone version (fugio.co/gummy-fisherman-mobile, folder `gummy-fisherman-mobile/`) was remade from scratch as a solo student game for 9:16 phones and tablets (portrait and landscape). It is now in this repository too.
- Foxino is the fisherman. 12 new ChatGPT pictures: Foxino fishing at Glimmerwater Lake, Frostfall Lake and Sapphire Sea (day, sunset and night), the menu, and cheering / junk poses.
- The places, fish (125), junk, descriptions, catch bar, kilos and points come from the Production game.
- A game is 3 rounds: 4 questions first (each answer shows how much the fish and the net grow), then the catch bar, then the catch. One score at the weigh-in; Frostfall opens at 1,200 points at Glimmerwater, Sapphire at 1,500 at Frostfall. Own Fish Index. No shop or money.
- Production's Phone mode still works: `?join=` links go to the old phone client, kept unchanged as `client.html`.
- Production (fugio.co/fish) did not change.

## v18 – 6 Nov 2026 · Catch bar
- After every round each player gets one try at the catch bar: tap CATCH! while the fish swims through the net. Better and faster answers make the net wider.
- Points at the end: 100 for every kilo of fish, plus up to 50 for every fast right answer.
- The CATCH! button is on each player's card, and only the current player's button works.
- Catch bar art for each place, made in ChatGPT: the bar, net, posts, fish, button ring and corner ornaments.
- Published 9 times that day. The last publish is the version in this repository.

## v17 – 31 Oct 2026 · Clean fight videos
- Gummy's 12 fight videos have clean edges, with no green-screen leftovers.
- Player profile videos for Frostfall Lake and Sapphire Sea. Pix's loops were remade so her eyes stay under her hair.
- An animated catch scene was tried, then turned off at the user's request.
- Question packages: 196 Czech-curriculum packages, A0–A2.

## v16 – 30 Oct 2026 · Each place looks different
- Catch pictures, a title logo, the end screens and the bonus round for each place.
- How to play was rebuilt with step-by-step screenshots for each place.
- How to play and Fish Index icons for each place. The Fish Index can be filtered by place.
- Gummy fights the fish on video, in every place.
- The lobby Settings button was removed.

## v15 – 29 Oct 2026 · Fish for every place
- Each place has its own fish, and the Fish Index is grouped by place. 25 new fish (#85–109).
- Junk items for each place.
- The menu background shows the chosen place. A mini map replaces the map button.
- The round backgrounds were redrawn so Gummy looks like his character design.
- New sound effects. The weigh-in is faster.

## v14 – 28 Oct 2026
- New full-resolution round backgrounds for all three places, preloaded on the loading screen. Glimmerwater Solo uses them too.

## v13 – 27 Oct 2026
- Frostfall Lake and Sapphire Sea opened on the map, each with day, sunset and night round pictures.

## v12 – 26 Oct 2026
- Closed places on the map show a faint "Coming soon".

## v11 – 24 Oct 2026 · Map and Gold Fish
- A map with three places (only Glimmerwater Lake open).
- Gold Fish (round 3, Team and 6p, 70 % chance) with its own cutscene and a 4th Bonus Round.
- Profiles are back: create and rename players and pick their picture. A profile already playing can't be picked twice.
- Right and wrong sounds no longer cut out.

## v10 – 22 Oct 2026
- 6p pull cutscenes for rounds 2 and 3.

## v9 – 21 Oct 2026 · 6p mode
- 6p mode: Rob and Gummy join in as players 5 and 6, with a pull cutscene after every round and a final group photo.
- No sentence is asked twice in one game. This was requested on 20 October; the exact publish day isn't recorded.

## v8 – 19 Oct 2026 · Question packages
- One game mode: put the right word into the sentence.
- Foxino question packages (A0–A2), picked in the lobby and sorted by level. Every game mixes a package's questions over the rounds at random.
- A loading screen picture. Lobby cards never get cut off.

## v7 – 18 Oct 2026 · fugio.co/fish
- The game moved to fugio.co/fish.
- A progress bar in the top bar, with lightning for answer streaks.
- Each player's own streak counts for the fish weight.
- Weigh-in total and place cards replace the leaderboard slide.
- New round 1 pictures for Team and Solo.
- A loading screen that preloads the game.

## v6 – 16 Oct 2026
- New Gummy logo and app icons.

## v5 – 15 Oct 2026 · Ready for school testing
- Player pictures are moving videos (Stella, Foxino, Pix, Ghost).
- A new round start card with the map name and round dots, tinted for each round.
- A new lobby: How to play and Fish Index buttons, and a moving lake background.

## v4 – 14 Oct 2026
- A moving video background in round 1.

## v3 – 13 Oct 2026 · Phone mode
- Phone mode: players join with a QR code or a 6-digit code and answer on their phones.

## v2 – 12 Oct 2026
- The Production version (`gummy-fisherman-copy`) was split off from the original game, with a download zip.

## v1 – 8 Oct 2026 and earlier · The first game
- Gap sentences: right answers reel the fish in, wrong ones let it pull Gummy towards the water.
- Team and Solo play, with characters Stella, Foxino, Pix and Ghost.
- Settings, Review answers on the leaderboard, and answer time per player.
