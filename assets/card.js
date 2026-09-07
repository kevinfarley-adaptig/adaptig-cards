/* Adaptig trainer card — shared behaviour.
   Every page sets window.TRAINER, then loads this file. Nothing else to edit.

   window.TRAINER = {
     name, role, org, city, blurb,
     phone,      // display form, e.g. "+852 6796 6993"
     whatsapp,   // digits only, e.g. "85267966993"  (false to hide the button)
     email,
     linkedin,   // full https:// URL          (false to hide)
     web,        // full https:// URL          (false to hide)
     event       // what follows "at" in the pre-written message
   }
*/
(function () {
  "use strict";

  var T = window.TRAINER;
  if (!T) return;

  /* ---------- helpers ---------- */

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in attrs) {
      if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function tidyUrl(u) {
    return String(u).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }

  // vCard 3.0 escaping: backslash, semicolon, comma, newline.
  function esc(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
                    .replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function nameParts(full) {
    var bits = String(full).trim().split(/\s+/);
    var last = bits.length > 1 ? bits.pop() : "";
    return { first: bits.join(" "), last: last };
  }

  /* ---------- the vCard ---------- */

  function vcard() {
    var n = nameParts(T.name);
    var lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:" + esc(n.last) + ";" + esc(n.first) + ";;;",
      "FN:" + esc(T.name)
    ];
    if (T.org)  lines.push("ORG:" + esc(T.org));
    if (T.role) lines.push("TITLE:" + esc(T.role));
    if (T.phone) lines.push("TEL;TYPE=CELL:" + String(T.phone).replace(/[^\d+]/g, ""));
    if (T.email) lines.push("EMAIL;TYPE=WORK:" + T.email);
    if (T.linkedin) {
      lines.push("item1.URL:" + T.linkedin);
      lines.push("item1.X-ABLabel:LinkedIn");
    }
    if (T.web) {
      lines.push("item2.URL:" + T.web);
      lines.push("item2.X-ABLabel:" + esc(T.org || "Website"));
    }
    lines.push("END:VCARD");
    return lines.join("\r\n") + "\r\n";
  }
  window.TRAINER_VCARD = vcard;

  /* ---------- the pre-filled opener ----------
     Whatever follows "at". Set `event` in trainer.js for your usual one;
     ?e=Bett%20Asia in the link overrides it for a single event. */

  var evt = "";
  try { evt = (new URLSearchParams(location.search).get("e") || "").trim().slice(0, 60); } catch (e) {}
  var where = "at " + (evt || T.event || "the conference");

  /* ---------- icons ---------- */

  var S = 'viewBox="0 0 24 24" class="ic" aria-hidden="true"';
  var stroke = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    save: '<svg ' + S + ' ' + stroke + '><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    whatsapp: '<svg ' + S + ' fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.25 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.87.86-.87 2.09s.9 2.43 1.02 2.6c.13.16 1.76 2.68 4.26 3.76.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>',
    mail: '<svg ' + S + ' ' + stroke + '><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    linkedin: '<svg ' + S + ' fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5ZM3 9h4v12H3zM9 9h3.8v1.64h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75V21h-4v-5.66c0-1.35-.03-3.09-1.94-3.09-1.94 0-2.24 1.46-2.24 2.99V21H9z"/></svg>',
    web: '<svg ' + S + ' ' + stroke + '><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    chev: '<svg ' + S + ' ' + stroke.replace('stroke-width="2"', 'stroke-width="2.4"') + ' style="flex:0 0 auto"><path d="m9 18 6-6-6-6"/></svg>'
  };

  function button(opts) {
    var a = el(opts.href ? "a" : "button", {
      "class": "btn btn--" + opts.tone,
      href: opts.href || null,
      type: opts.href ? null : "button",
      target: opts.external ? "_blank" : null,
      rel: opts.external ? "noopener" : null,
      id: opts.id || null
    });
    a.innerHTML =
      ICON[opts.icon] +
      '<span class="txt">' + opts.title +
      '<span class="sub">' + opts.sub + "</span></span>" +
      (opts.external ? '<span class="chev">' + ICON.chev + "</span>" : "");
    return a;
  }

  /* ---------- build the card ---------- */

  var root = document.getElementById("card");
  if (!root) return;

  var head = el("div", {});
  head.innerHTML =
    '<div class="logo" role="img" aria-label="' + (T.org || "Adaptig") + '"></div>' +
    "<h1>" + T.name + "</h1>" +
    '<p class="role">' + [T.role, T.org].filter(Boolean).join(", ") + "</p>" +
    (T.city ? '<p class="meta">' + T.city + "</p>" : "") +
    '<hr class="rule">' +
    (T.blurb ? '<p class="blurb">' + T.blurb + "</p>" : "");
  root.appendChild(head);

  /* Save my contact — the loud accent goes to the action that matters most. */
  var saveStack = el("div", { "class": "stack" });
  var saveBtn = button({
    tone: "orange", icon: "save", id: "save",
    title: "Save my contact",
    sub: "Straight into your phone's contacts"
  });
  saveStack.appendChild(saveBtn);
  root.appendChild(saveStack);

  root.appendChild(el("div", { "class": "spacer" }));

  /* Get in touch */
  root.appendChild(el("p", { "class": "label", text: "Get in touch" }));
  var stack = el("div", { "class": "stack" });

  if (T.whatsapp) {
    stack.appendChild(button({
      tone: "green", icon: "whatsapp",
      href: "https://wa.me/" + T.whatsapp + "?text=" +
            encodeURIComponent("Hi " + T.name.split(" ")[0] + ", we met " + where + " today. "),
      title: "WhatsApp",
      sub: evt ? 'Opens with "we met ' + where + '"' : "Message already written, just send"
    }));
  }
  if (T.email) {
    stack.appendChild(button({
      tone: "charcoal", icon: "mail",
      href: "mailto:" + T.email +
            "?subject=" + encodeURIComponent("We met " + where) +
            "&body=" + encodeURIComponent("Hi " + T.name.split(" ")[0] + ",\n\nWe met " + where + " today. \n\n"),
      title: "Email", sub: T.email
    }));
  }
  if (T.linkedin) {
    stack.appendChild(button({
      tone: "aqua", icon: "linkedin", href: T.linkedin, external: true,
      title: "LinkedIn", sub: tidyUrl(T.linkedin)
    }));
  }
  if (T.web) {
    stack.appendChild(button({
      tone: "sky", icon: "web", href: T.web, external: true,
      title: tidyUrl(T.web), sub: "What " + (T.org || "we") + " does"
    }));
  }
  root.appendChild(stack);

  /* Details, always visible. If every button fails, this still works. */
  var rows = [
    ["Name", T.name],
    ["Role", [T.role, T.org].filter(Boolean).join(", ")],
    ["Mobile", T.phone ? '<a href="tel:' + String(T.phone).replace(/[^\d+]/g, "") + '">' + T.phone + "</a>" : null],
    ["Email", T.email ? '<a href="mailto:' + T.email + '">' + T.email + "</a>" : null],
    ["LinkedIn", T.linkedin ? tidyUrl(T.linkedin) : null],
    ["Web", T.web ? tidyUrl(T.web) : null]
  ].filter(function (r) { return r[1]; });

  var details = el("div", { "class": "details" });
  details.innerHTML =
    "<dl>" + rows.map(function (r) {
      return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>";
    }).join("") + "</dl>" +
    '<span class="note" id="note" hidden></span>';
  root.appendChild(el("div", { "class": "spacer" }));
  root.appendChild(el("p", { "class": "label", text: "Or copy from here" }));
  root.appendChild(details);

  if (T.footer) {
    root.appendChild(el("footer", { html: T.footer }));
  }

  /* ---------- saving the contact ---------- */

  var note = document.getElementById("note");
  function say(msg) { note.textContent = msg; note.hidden = false; }

  saveBtn.addEventListener("click", function () {
    var blob = new Blob([vcard()], { type: "text/vcard;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = T.name + ".vcf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);

    // Some in-app browsers (LinkedIn, Instagram, WeChat) block downloads outright.
    var inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|LinkedInApp|Twitter/i.test(navigator.userAgent || "");
    say(inApp
      ? "If nothing happened, open this page in Safari or Chrome and tap again. The details below always work."
      : "Saved. Open the downloaded file to add the contact.");
  });
})();
