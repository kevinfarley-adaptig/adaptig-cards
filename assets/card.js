/* Adaptig trainer card — shared behaviour.

   The card is real HTML. Everything a visitor needs is in the markup and works
   with this file blocked, missing, or switched off: name, role, and every
   contact detail as a live link. This script only adds what markup cannot do —
   the big tap targets, the pre-written openers, the contact download, and the
   QR view.

   That is also why there is no config object. The details live once, in the
   visible markup, tagged with data-field. Two copies of a phone number is one
   copy too many.

   Per-trainer options sit on <main>:
     data-whatsapp  digits only, no plus, no spaces. Omit to hide the button.
     data-event     optional venue named in the opener. ?e= in the link wins.
*/
(function () {
  "use strict";

  var root = document.getElementById("card");
  if (!root) return;

  /* ---------- read the card ---------- */

  function field(name) {
    var el = root.querySelector('[data-field="' + name + '"]');
    if (!el) return "";
    if (el.tagName === "A") return el.getAttribute("href") || "";
    return (el.textContent || "").trim();
  }
  function text(name) {
    var el = root.querySelector('[data-field="' + name + '"]');
    return el ? (el.textContent || "").trim() : "";
  }

  var T = {
    name:     text("name"),
    role:     text("role"),
    org:      text("org"),
    city:     text("city"),
    phone:    text("phone"),
    tel:      field("phone").replace(/^tel:/, ""),
    email:    field("email").replace(/^mailto:/, ""),
    linkedin: field("linkedin"),
    web:      field("web"),
    whatsapp: root.dataset.whatsapp || "",
    event:    root.dataset.event || ""
  };
  if (!T.name) return;

  var first = T.name.split(" ")[0];

  /* ---------- the vCard ----------
     vCard 3.0. Escaping per RFC 2426: backslash, semicolon, comma, newline.
     The organisation website is deliberately not in here. It costs a QR
     version, and the email domain and ORG line already say Adaptig. */

  function esc(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
                    .replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }
  function vcard() {
    var bits = T.name.trim().split(/\s+/);
    var last = bits.length > 1 ? bits.pop() : "";
    var lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:" + esc(last) + ";" + esc(bits.join(" ")) + ";;;",
      "FN:" + esc(T.name)
    ];
    if (T.org)   lines.push("ORG:" + esc(T.org));
    if (T.role)  lines.push("TITLE:" + esc(T.role));
    if (T.tel)   lines.push("TEL;TYPE=CELL:" + T.tel.replace(/[^\d+]/g, ""));
    if (T.email) lines.push("EMAIL;TYPE=WORK:" + T.email);
    if (T.linkedin) {
      lines.push("item1.URL:" + T.linkedin.replace(/^https?:\/\/(www\.)?/, "https://").replace(/\/$/, ""));
      lines.push("item1.X-ABLabel:LinkedIn");
    }
    lines.push("END:VCARD");
    return lines.join("\r\n") + "\r\n";
  }
  window.TRAINER_VCARD = vcard;

  /* ---------- the pre-filled opener ----------
     The code is permanent. It goes on a lock screen, a slide, a signature, and
     gets scanned months later, so it names no venue unless one is set.

     It ends where they type. Phone keyboards drop the cursor after pre-filled
     text, so anything past the blank is text they must reach back and edit
     around. The identity prompt goes last, always.

     We ask for the one thing the channel does not already hand over: who they
     are and who they are from. Their number arrives with the message anyway. */

  var evt = "";
  try { evt = (new URLSearchParams(location.search).get("e") || "").trim().slice(0, 60); } catch (e) {}
  var place = evt || T.event || "";

  var opener  = place ? "Hi " + first + ", we met at " + place + ". It's "
                      : "Hi " + first + ", it's ";
  var subject = place ? "We met at " + place : "We met";
  var body    = place ? "Hi " + first + ",\n\nWe met at " + place + ". It's "
                      : "Hi " + first + ",\n\nIt's ";

  /* ---------- icons ---------- */

  var A = 'viewBox="0 0 24 24" class="ic" aria-hidden="true" focusable="false"';
  var K = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    save: '<svg ' + A + ' ' + K + '><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
    whatsapp: '<svg ' + A + ' fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.25 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.86-.87 2.09s.9 2.43 1.02 2.6c.13.16 1.76 2.68 4.26 3.76.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>',
    mail: '<svg ' + A + ' ' + K + '><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    linkedin: '<svg ' + A + ' fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5ZM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.66c0-1.35-.03-3.09-1.94-3.09-1.94 0-2.24 1.46-2.24 2.99V21H9z"/></svg>',
    web: '<svg ' + A + ' ' + K + '><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    chev: '<svg ' + A + ' ' + K.replace('stroke-width="2"', 'stroke-width="2.4"') + ' class="ic chev"><path d="m9 18 6-6-6-6"/></svg>'
  };

  function button(o) {
    var tag = o.href ? "a" : "button";
    var el = document.createElement(tag);
    el.className = "btn btn--" + o.tone;
    if (o.href) {
      el.href = o.href;
      if (o.external) { el.target = "_blank"; el.rel = "noopener"; }
    } else {
      el.type = "button";
    }
    if (o.id) el.id = o.id;
    el.innerHTML = ICON[o.icon] +
      '<span class="txt">' + o.title + '<span class="sub">' + o.sub + "</span></span>" +
      (o.external ? ICON.chev : "");
    return el;
  }

  /* ---------- build the actions ---------- */

  var slot = document.getElementById("actions");
  if (!slot) return;

  function label(t) {
    var p = document.createElement("p");
    p.className = "label";
    p.textContent = t;
    return p;
  }
  function stack() {
    var d = document.createElement("div");
    d.className = "stack";
    return d;
  }

  var saveBtn = button({
    tone: "orange", icon: "save", id: "save",
    title: "Save my contact",
    sub: "Straight into your phone's contacts"
  });
  var s1 = stack(); s1.appendChild(saveBtn);
  slot.appendChild(s1);

  var gap = document.createElement("div");
  gap.className = "spacer";
  slot.appendChild(gap);
  slot.appendChild(label("Get in touch"));

  var s2 = stack();
  if (T.whatsapp) {
    s2.appendChild(button({
      tone: "green", icon: "whatsapp",
      href: "https://wa.me/" + T.whatsapp + "?text=" + encodeURIComponent(opener),
      title: "WhatsApp", sub: "Just add your name and send"
    }));
  }
  if (T.email) {
    s2.appendChild(button({
      tone: "charcoal", icon: "mail",
      href: "mailto:" + T.email + "?subject=" + encodeURIComponent(subject) +
            "&body=" + encodeURIComponent(body),
      title: "Email", sub: T.email
    }));
  }
  if (T.linkedin) {
    s2.appendChild(button({
      tone: "aqua", icon: "linkedin", href: T.linkedin, external: true,
      title: "LinkedIn", sub: tidy(T.linkedin)
    }));
  }
  if (T.web) {
    s2.appendChild(button({
      tone: "sky", icon: "web", href: T.web, external: true,
      title: tidy(T.web), sub: "What " + (T.org || "we") + " does"
    }));
  }
  slot.appendChild(s2);

  function tidy(u) {
    return String(u).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }

  /* ---------- saving the contact ---------- */

  var note = document.getElementById("note");
  function say(msg) {
    if (!note) return;
    note.textContent = msg;
    note.hidden = false;
  }

  saveBtn.addEventListener("click", function () {
    var url;
    try {
      url = URL.createObjectURL(new Blob([vcard()], { type: "text/vcard;charset=utf-8" }));
    } catch (e) {
      say("This browser will not let the page save a file. The details below always work.");
      return;
    }
    var a = document.createElement("a");
    a.href = url;
    a.download = T.name + ".vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

    // LinkedIn, Instagram, WeChat and friends open links in a webview that
    // blocks downloads outright. Nothing is thrown, nothing happens.
    var inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|LinkedInApp|Twitter|OKApp/i
                  .test(navigator.userAgent || "");
    say(inApp
      ? "If nothing downloaded, open this page in Safari or Chrome and tap again. The details below always work."
      : "Saved. Open the downloaded file to add the contact.");
  });

  /* ================================================================
     The QR view, at #qr. Same page, so a trainer has one file to edit.
     The library is fetched only when this view is opened, so the card
     itself never pays for it.
     ================================================================ */

  var view = document.getElementById("qrview");

  function cardUrl() {
    return location.href.split("#")[0];
  }

  function drawInto(box, data, ecc) {
    var q = window.AdaptigQR.make(data, ecc);
    // An <img> rather than a canvas: press-and-hold saves it to Photos, which
    // is how a trainer gets the code onto their lock screen. Margin is in
    // pixels, so 40 gives the four-module quiet zone the spec requires.
    // Without it scanners fail against a busy background.
    var img = new Image();
    img.src = window.AdaptigQR.toImgSrc(q, 10, 40);
    img.alt = "QR code";
    img.decoding = "async";
    box.innerHTML = "";
    box.appendChild(img);
    return q.size;
  }

  if (view) {
    var stage   = view.querySelector("#qrstage");
    var box     = view.querySelector("#qr");
    var head    = view.querySelector("#qrhead");
    var sub     = view.querySelector("#qrsub");
    var evtCell = view.querySelector("#qrevent");
    var linkCell= view.querySelector("#qrlink");
    var tabC    = view.querySelector("#tab-contact");
    var tabL    = view.querySelector("#tab-links");
    var fail    = view.querySelector("#qrfail");
    var current = "contact";

    function render(which) {
      current = which;
      var isContact = which === "contact";
      tabC.setAttribute("aria-selected", isContact ? "true" : "false");
      tabL.setAttribute("aria-selected", isContact ? "false" : "true");

      if (!window.AdaptigQR) { fail.hidden = false; box.innerHTML = ""; return; }
      fail.hidden = true;
      // Correction level is a trade against module size, and module size is
      // what actually decides whether a camera reads the code across a table.
      // The contact code carries the most data, so it takes level M: that
      // recovers 15% of the codewords against a logo plate covering about 5%
      // of the area, roughly three times the headroom needed, and it buys 20%
      // larger modules than level Q (61 modules instead of 73). The link code
      // is short enough that level Q costs nothing, so it keeps the wider
      // margin.
      var mods = isContact
        ? drawInto(box, vcard(), "M")
        : drawInto(box, cardUrl() + location.search, "Q");
      stage.dataset.modules = mods;
      head.textContent = isContact ? "Scan to save me" : "Scan to open my card";
      sub.textContent  = isContact
        ? "Goes straight into their contacts. Works with no internet."
        : "WhatsApp, email, LinkedIn. They pick.";
    }

    tabC.addEventListener("click", function () { render("contact"); });
    tabL.addEventListener("click", function () { render("links"); });

    // Tap the code to fill the screen. Bigger modules on a plain white ground
    // is the single thing that most improves a scan across a table.
    function toggleFull() {
      view.classList.toggle("full");
      var on = view.classList.contains("full");
      stage.setAttribute("aria-pressed", on ? "true" : "false");
      stage.setAttribute("aria-label", on ? "Tap to shrink the code" : "Tap to fill the screen");
      try {
        if (on) { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
        else if (document.fullscreenElement) { document.exitFullscreen(); }
      } catch (e) {}
    }
    stage.addEventListener("click", toggleFull);
    // It is announced as a button, so it has to behave like one.
    stage.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        toggleFull();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && view.classList.contains("full")) toggleFull();
    });

    function syncHash() {
      var on = location.hash === "#qr";
      view.hidden = !on;
      root.hidden = on;
      document.body.classList.toggle("qrmode", on);
      if (on) {
        if (evtCell) {
          evtCell.textContent = place
            ? place + ", named in the message"
            : "None. Add ?e=Event+Name to this link for a code that names one.";
        }
        if (linkCell) linkCell.textContent = tidy(cardUrl());
        render(current);
      }
    }
    window.addEventListener("hashchange", syncHash);
    syncHash();
  }
})();
