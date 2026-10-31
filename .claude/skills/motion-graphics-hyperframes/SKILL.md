---
name: motion-graphics-hyperframes
description: Make animated motion graphics, kinetic-type videos, product/SaaS promos, graphics over talking-head reels, sound effects and spec ads using Claude Code + HyperFrames (HTML page rendered to MP4). Use when the user wants animated cards, counters, text-only videos, reel overlays, TikTok/Instagram Reels motion graphics, or asks to fix a cheap-looking motion video. Based on "Motion Graphics with Claude Code" by Damiano Caudullo (@damianodesu).
---

# Motion Graphics with Claude Code + HyperFrames

A video = an `index.html` (what's on screen) + a timeline (what moves, when) + a render (Chrome frames -> FFmpeg -> MP4). Never drag keyframes: edit the text file, render again. Requires Claude Code (paid plan), Node.js 22+, FFmpeg, whisper-cpp.

## 1. Setup (once per computer)
Detect Mac/Windows. Check/install Node 22+, FFmpeg, whisper-cpp (Homebrew / winget; Windows whisper from github.com/ggml-org/whisper.cpp + PATH). Run `npx hyperframes skills`, then `npx hyperframes doctor` (ignore optional: Docker, Kokoro, MusicGen). If password/admin needed, give the exact command and stop. Tell the user to RESTART Claude Code so skills load. Copy the kit's `fonts/` (and `sfx/`) folder into each project.

## 2. Workflow rules
- Get a base you like first, then change ONE moment at a time.
- After each render stay in the same session; end every edit with: "Keep everything else the same and render again to renders/<name>.mp4".
- Refer to moments by words spoken ("when I say sales"), not seconds; find them via `npx hyperframes transcribe`. Transcript can be ~1s off: check against audio.
- Give real assets (screenshots, product.png, logo). Without real numbers Claude invents examples: always supply real data.
- Describe problems like to a friend; plain words beat technical ones.

## 3. Knobs (edit any render)
Surface (glass -> gradient/solid), Colour (hex values), Type (font + size %), Motion (bouncier/overshoot), Timing (seconds), Layout (position/size %).

## 4. Named moves
Rise, Pop (overshoot), Count-up, Checklist tick, Typewriter, Slide-in, Blur-in, Punch-in (fast zoom on the memorable line), Reframe (video shrinks into a card), Bar fill.

## 5. Style blocks (paste under a base prompt)
- **Kinetic Type**: text is the whole video, no cards. Archivo Black, ALL CAPS, huge; black bg, white text, accent #c6ff3d on key word. Words slam in (power4.out, 0.25-0.4s): slide, squash-stretch, letter split. Cut on word rhythm.
- **Liquid Glass**: white ~80% cards, 30px blur, thin white border, 32px radius, soft shadow; soft light gradient + 2-3 drifting blurred blobs (pale blue, lilac, peach); Inter 700/400, text #1d1d1f, small grey uppercase labels; green #34c759 only for ticks. Cards rise 30px + fade, power3.out 0.6s, scale from 0.96. Calm, no bounce.
- **Editorial Grain**: magazine page; paper #efe8dc + animated SVG noise ~12%; Instrument Serif (upright + italic mix), Inter uppercase labels; ink #1a1a1a + red #c2412d; rotated (1-3deg) cut-out paper shapes, thin rules, page numbers; unhurried, uneven staggers, no bounce. Grain = big files: render with `--crf 23`.
- **Pop Bold**: flat colour, no gradients/glass; Bricolage Grotesque 800; #c6ff3d, #8a3cff, #ff4fd8, #111111; 4px black outlines, hard 8px offset shadows; spinning star/circle stickers; back.out(2.5), wobble, squash-stretch.

## 6. Use-case prompt templates
**Text-only video** (vertical 1080x1920, 30fps): "Make a 15-second vertical video with HyperFrames, only animated text, no footage. Script: [SCRIPT]. Use my exact words, don't rewrite. One sentence per screen, big for phones, wrap long ones over 2-3 lines, each screen long enough to read, all text inside middle 80% of width. Follow STYLE block if present, else white frosted cards on soft light gradient, Inter. Render to renders/text.mp4."

**Product launch** (1920x1080, 12s): 0-2s logo/name reveal; 2-9s three feature moments, each SHOWING the product doing it; 9-12s end card (name, one line, CTA). Use product.png if present else build in HTML/CSS.

**SaaS promo** (60s): "You're an amazing motion graphics designer..." Look at every screenshot first; short hook; show each screen and zoom into the part that matters with one line of customer benefit; use screenshots as-is (don't redraw); kinetic style, fast zooms/pans, cuts on a beat; end on logo + line + CTA.

**Graphics on own video** (clip.mp4): Transcribe first; understand which moments matter; keep video exactly as is (size, fps, audio, cut), only add overlays; animation matched to what is said (number->counter, list->checklist, before/after->comparison) starting on the exact word; one consistent style; NOTHING in first 3 seconds; keep off the face, out of bottom third (captions), away from left/right 10%.

**Fix one spot**: "When I say [phrase], show the [N] screenshots in the screenshots folder popping up in order, synced to my voice. Keep everything else exactly the same."

## 7. Sound
Small clicks only on things that matter: tick per list item, counter sound while a number rolls, chime on last card. No sound for card slide in/out, no whooshes. Keep effects ~20 dB under the voice. (Spec ads are different: every move gets a sound.)

## 8. Export
`npx hyperframes render . --fps 60` | `--resolution 4k` | `--fps 24` | `--format mov` (ProRes) | `--format png-sequence` | `--crf 23` (smaller file). Overlays for Premiere/After Effects: make background transparent first, export ProRes 4444 alpha .mov + PNG sequence; frosted cards lose blur on transparency, so use SOLID cards for overlays.

## 9. Troubleshooting
1 Wrong font -> put file in fonts/, "use the font file in fonts". 2 Text cut on phones -> "keep all text inside middle 80% of width". 3 Card covers captions -> "move every card above the caption area". 4 Card early/late -> name the exact word. 5 Huge file -> `--crf 23`.

## 10. Seven fixes for cheap-looking videos
1. **Flat cards**: clear liquid glass, no blur; SVG displacement filter (feTurbulence -> feDisplacementMap) as backdrop-filter, saturate(180%), 5% white tint, 1px top highlight; busy detail underneath; never put filter/opacity/clip-path on the card's parent.
2. **Flat talking head**: clean matte cutout; UI cards at 3 depths (far/small/blurred, beside/sharp, near lens/big/blurred), tilted in 3D, morphing; face natural, no colour/glow.
3. **Toy-like 3D**: build in Blender (blender-mcp): real model, matte materials, one soft key + rim light, real floor shadow; grey clay preview first, render only after user OK. Setup: Blender 4.2+, install uv, `claude mcp add --scope user blender uvx blender-mcp`, install addon.py from github.com/ahujasid/blender-mcp, N -> BlenderMCP -> Connect. ~20 min per 10 s of 3D.
4. **Template-looking effects**: find a real reference, copy how it moves; every repeat different shape/size/speed; slightly rough edges; weight (react, overshoot, settle); no straight lines or identical copies.
5. **Boring numbers**: turn key numbers into soft 3D objects with personality (glossy coin, eyes, reaction); on a drop something bites/melts it; new number lands with bounce.
6. **Fake UI**: rebuild real app screens from screenshots, same layout and labels, crisp; move camera close, following cursor and numbers.
7. **Instagram Reels (1080x1920) safe area**: nothing in top 10%, bottom 20%, right 15%; render one frame with Reels buttons drawn on top to prove nothing is covered.

## 11. Spec ad (any brand) - key rules
23s ad, 16:9 and 9:16, decide everything without asking. Star = brand's most famous real icon from official files, never redrawn. Match its medium (pixel->voxel world; flat mascot->parallax; 3D->Three.js). It ACTS (real poses, squash/stretch), never slides. Facts: 6 true details in FACTS.md. Structure: 0-1s real screen + tap; 1-2s star pops out; 2-9s travels brand-built world; 9s the turn on music drop; 10-16s three real usage places; 16-19s logo + tagline; 19-20s TV power-off; 20-23s opening screen with "Comment [KEYWORD]" CTA. Small footer "Spec ad - not affiliated with [BRAND]". Nothing passes through anything, nothing floats (contact shadows). Voice 4 short lines (`npx hyperframes tts` or ElevenLabs); music drop on the turn, ducked; CC0 sounds (Openverse, kenney.nl); voice >=12 LU over music, master -14 LUFS, true peak < -1 dB. CHECK: frame every 0.25s, side view `npx hyperframes snapshot --angle side`. 9:16 = re-framed shots, text 170-1330px from top, right edge clear.
