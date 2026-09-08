# Adaptig trainer cards

Digital business cards for the Adaptig network. Someone scans your code and can
save you to their contacts, message you on WhatsApp with the first line already
written, email you, or find you on LinkedIn. Nothing to print.

Live at **https://kevinfarley-adaptig.github.io/adaptig-cards/**

## Add yourself

1. Copy the `_template` folder. Rename it to your first name, lowercase, no spaces.
2. Open `index.html` in your new folder and change your details. **That is the
   only file with your information in it.** There is no config file.
3. Add yourself to the list in the root `index.html`.
4. Commit. Your card is live in about a minute at
   `https://kevinfarley-adaptig.github.io/adaptig-cards/yourname/`

Everything you edit is in one file and marked with comments: the title and
description at the top, then your name, role, city, one line about what you do,
and the four contact rows. Your phone number for WhatsApp goes in
`data-whatsapp` on the `<main>` tag, digits only.

## Get your QR codes

Add `#qr` to your card's address and open it on your phone:

```
https://kevinfarley-adaptig.github.io/adaptig-cards/yourname/#qr
```

Two codes, switchable:

- **Save my contact.** Your details encoded directly in the code. It goes
  straight into their contacts and works with no internet at all. This is the
  one to show in a noisy room.
- **Open my card.** Points at your card page. Use it when you want them to see
  the branded page and pick a channel.

**Tap the code to fill the screen.** That makes each square about 20% larger on
a plain white background, which is the single thing that most improves a scan
across a table. Press and hold to save the code to your photos, then set it as
a lock screen and you can show it without unlocking your phone.

## The pre-written message

Tapping WhatsApp or Email opens with an opener already typed:

```
Hi Kevin, it's
```

It stops there on purpose. Three reasons.

**The code is permanent.** It goes on a lock screen, a slide, an email
signature. It gets scanned at events, after workshops, and months later. So it
names no venue unless you set one.

**You need what the channel does not already give you.** WhatsApp hands you
their number and display name with the message. What is missing is who they are
and who they are from. So the opener asks for that and nothing else.

**The cursor lands at the end.** Phone keyboards drop it after the pre-filled
text, so anything written past the blank is text they have to reach back and
edit around. Most will not. Whatever they need to type comes last, always.

## Naming an event when you want one

Set `data-event` on the `<main>` tag, or add `?e=` to the link, and the venue is
named first, before the prompt:

| | Opens with |
|---|---|
| Default | `Hi Kevin, it's ` |
| Event named | `Hi Kevin, we met at Bett Asia. It's ` |

The link wins over the attribute, so you can keep the attribute empty and mint a
one-off code for a single event:

```
https://kevinfarley-adaptig.github.io/adaptig-cards/kevin/?e=Bett%20Asia
```

Open your `#qr` view with the same parameter on it and the card code it draws
carries the event through. That page tells you which event, if any, the code
currently names.

## How it is built

Plain HTML, CSS and two JavaScript files. No build step, no framework, no npm,
and **no third-party scripts at all**. Edit a file, commit, it is live.

    index.html            the list of cards
    _template/index.html  copy this
    <name>/index.html     one trainer, one file
    assets/card.css       all styling
    assets/card.js        buttons, vCard, pre-written messages, the QR view
    assets/qr.js          the QR encoder
    tests/                optional, see below

### The card works without JavaScript

Your name, role, city, blurb and every contact detail are real HTML with real
`tel:`, `mailto:` and `https:` links. If `card.js` is blocked, fails to load, or
JavaScript is switched off, the page still shows all of it and every link still
works. The script only adds what markup cannot do: the big tap targets, the
pre-written openers, the contact download and the QR view.

That is also why there is no config file. Your details live once, in the visible
markup, tagged with `data-field`. The script reads them from there. Two copies
of a phone number is one copy too many.

### Colour

Six Adaptig brand colours, plus one derived value. Each button colour means
something rather than decorating, and every one clears WCAG AA on both its title
and its sub-label:

| Button | Colour | Text | Contrast |
|---|---|---|---|
| Save my contact | Orange Peel `#fa5929` | charcoal | 4.99 |
| WhatsApp | Leaf Green tint `#389a71` | charcoal | 4.61 |
| Email | Charcoal `#212124` | beige | 14.7 |
| LinkedIn | Aqua Blue `#0a66db` | beige | 4.90 |
| Website | Sky Blue `#abc9f5` | charcoal | 9.49 |

Leaf Green at full strength gives charcoal only 4.36, just under the 4.5 that AA
asks for, so it is lifted 4% toward white. The brand pack allows tints of the
six; it does not allow new hues, and there are none here.

### Type

Bricolage Grotesque and Figtree from Google Fonts. These are the open-licence
stand-ins for Proxima Nova, which is licensed to Adaptig and cannot be
redistributed in a public repository. Do not swap Proxima Nova in here. If the
fonts fail to load the page falls back to the system stack and still reads
correctly.

### The QR codes

`assets/qr.js` is a QR encoder written for this repo rather than pulled from a
CDN. Some of the networks these cards get used on block third-party script
hosts, and a card that cannot draw its own code is useless at the moment it is
needed.

The contact code uses correction level M and the link code level Q. Correction
level trades against module size, and module size is what actually decides
whether a camera reads the code across a table. Level M gives the contact code
61 squares instead of 73, about 20% larger on screen, while still recovering
three times more than the Adaptig mark in the middle obscures.

## Tests

Optional. You only need these if you change `qr.js` or the colours.

    tests/verify_qr.py    proves the encoder against a reference implementation
    tests/harness.py      scores the built card: scan reliability, contrast,
                          layout on four real phone sizes, no-JS behaviour,
                          page weight

`verify_qr.py` checks two things. Where a payload exactly fills a symbol, so no
padding is involved, every matrix must be byte-identical to the reference for
all four correction levels and all eight masks. And every code, at every level,
must decode back to its exact input. Last run: 448/448 and 48/48.

Requires `python3`, `node`, and `pip install segno pyzbar playwright
opencv-python-headless` plus `apt install libzbar0`.

## If a button does nothing

In-app browsers inside LinkedIn, Instagram and WeChat block file downloads, so
"Save my contact" can fail there. The page detects it and tells the visitor to
open the page in Safari or Chrome. Every detail is also printed in plain text at
the bottom of the card, so there is always a way through.
