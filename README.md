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

## The pre-written message

Tapping WhatsApp or Email opens with an opener already typed:

```
Hi Kevin, it's
```

It stops there on purpose. Three reasons.

**The code is permanent.** It goes on a lock screen, a slide, an email signature.
It gets scanned at events, after workshops, and months later. So it names no
venue unless you set one.

**You need what the channel does not already give you.** WhatsApp hands you their
number and display name with the message. What is missing is who they are and who
they are from. So the opener asks for that and nothing else.

**The cursor lands at the end.** Phone keyboards drop it after the pre-filled
text, so anything written past the blank is text they have to reach back and edit
around. Most will not. Whatever they need to type comes last, always.

## Naming an event when you want one

Set `event` in your `trainer.js`, or add `?e=` to the link, and the venue is named
first, before the prompt:

| | Opens with |
|---|---|
| Default | `Hi Kevin, it's ` |
| Event named | `Hi Kevin, we met at Bett Asia. It's ` |

The link wins over the `event` field, so you can keep the field off and mint a
one-off code for a single event:

```
https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/?e=Bett%20Asia
```

Easiest way to do that: open your `qr.html` with the same parameter on it, and the
card code it draws carries the event through.

```
https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/qr.html?e=Bett%20Asia
```

That page tells you which event, if any, the code currently names.

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
| `event` | Optional venue named before the prompt, e.g. `"Bett Asia"`. `false` names none, which is right for a permanent code. |
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
