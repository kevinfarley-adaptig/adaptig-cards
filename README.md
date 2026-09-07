# Adaptig trainer cards

Digital business cards for the Adaptig network. Someone scans your QR code, and
they can save you to their contacts, message you on WhatsApp with the first line
already written, email you, or find you on LinkedIn. Nothing to print.

Live at **https://kevinfarley-adaptig.github.io/adaptig-cards/**

## Add yourself

1. Copy the `_template` folder. Rename it to your first name, lowercase, no spaces.
2. Open `trainer.js` in your new folder. Change the details. That is the only file
   with your information in it.
3. Open `index.html` in the same folder and change the three marked lines at the
   top: the title, the OG title, and the description. These are what show up in a
   browser tab and in a link preview.
4. Add yourself to the list in the root `index.html`.
5. Commit. Your card is live in about a minute at
   `https://kevinfarley-adaptig.github.io/adaptig-cards/yourname/`

## Get your QR code

Open `yourname/qr.html` on your phone. Two codes, switchable:

- **Save my contact.** A vCard encoded directly in the code. It goes straight into
  their contacts and works with no internet at all. This is the one to show in a
  noisy room.
- **Open my card.** Points at your card page. Use it when you want them to see the
  branded page and pick a channel.

Press and hold either code to save it to your photos. Set it as a lock screen and
you can show it without unlocking your phone.

## Naming the event

Add `?e=` and the event name to your link and the pre-written WhatsApp and email
messages change to match:

```
https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/?e=Bett%20Asia
```

That opens WhatsApp with "Hi Kevin, we met at Bett Asia today." Without it, the
message says "at the conference", which works anywhere.

## Fields in trainer.js

| Field | Notes |
|---|---|
| `name` | Full name |
| `role` | Job title |
| `org` | Company |
| `city` | Where you are based |
| `blurb` | One line. Keep it short, it sits under the rule. |
| `phone` | Display form, e.g. `+852 6796 6993` |
| `whatsapp` | Digits only, no plus, no spaces, e.g. `85267966993`. `false` hides it. |
| `email` | |
| `linkedin` | Full URL. `false` hides it. |
| `web` | Full URL. `false` hides it. |
| `footer` | One line at the bottom. `false` hides it. |

## How it is built

Plain HTML, CSS and one JavaScript file. No build step, no framework, no npm.
Edit a file, commit, it is live.

- `assets/card.css` — all styling. Adaptig brand colours and type scale. The
  wordmark is embedded as a data URI so the repo has no binary files.
- `assets/card.js` — builds the card from `window.TRAINER`, generates the vCard
  download, handles the pre-written messages.
- `<name>/trainer.js` — your details.
- `<name>/index.html` — your card.
- `<name>/qr.html` — your QR codes.

### Colour

Six Adaptig brand colours, no seventh. Each button colour means something rather
than decorating:

| Button | Colour | Why |
|---|---|---|
| Save my contact | Orange Peel `#fa5929` | The loud accent goes to the action that matters most |
| WhatsApp | Leaf Green `#30966b` | WhatsApp's own colour, recognised before it is read |
| Email | Charcoal Black `#212124` | Strong and neutral, holds the middle |
| LinkedIn | Aqua Blue `#0a66db` | Almost exactly LinkedIn's blue |
| Website | Sky Blue `#abc9f5` | The palette's designated secondary surface |

### Type

Bricolage Grotesque and Figtree, loaded from Google Fonts. These are the
open-licence stand-ins for Proxima Nova, which is licensed to Adaptig and cannot
be redistributed in a public repository. Do not swap Proxima Nova in here.

## If a button does nothing

In-app browsers inside LinkedIn, Instagram and WeChat block file downloads, so
"Save my contact" can fail there. The page detects it and tells the visitor to
open the page in Safari or Chrome. The details are also printed in plain text at
the bottom of every card, so there is always a way through.
