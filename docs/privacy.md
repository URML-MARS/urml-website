# Privacy

This site collects nothing about you as you browse. The one exception is the contact form, which only collects what you choose to type into it. Both statements are verifiable by reading the source.

## What this site does not do

- No cookies. The site sets none.
- No analytics. No Google Analytics, no Plausible, no anything that counts or profiles visitors.
- No third-party loads. No fonts, scripts, or trackers from other origins. A Content-Security-Policy header blocks any cross-origin request at the browser level, so if a future change tried to add one, it would break visibly instead of leaking quietly.
- No tracking, no newsletter, no automatic data collection. Browsing any page sends us nothing.
- No JavaScript beyond what the documentation theme ships for on-device search and the light/dark toggle. Neither sends anything anywhere.

## The contact form

The [contact page](contact.md) has a form. It is the only place on this site that takes input, and it only does so when you deliberately fill it in and submit.

If you submit it, the form sends what you typed (your message, the email address you provide for a reply, and an optional name) to Netlify, which hosts this site. Netlify stores the submission in the project's Netlify dashboard and notifies the maintainer so you get a reply. That is the entire data flow. The form uses no third-party service, sets no cookies, and loads no tracker. Spam is filtered with a hidden honeypot field, not a third-party CAPTCHA.

If you would rather not use the form, the same contact page lists a GitHub issue tracker and an email address that reach the same person.

## The hosting caveat

This site is hosted on Netlify. Like any web host or CDN, Netlify processes the basic technical metadata needed to serve a page: your IP address, the request time, and the file requested. That happens at the network layer for every site on the internet and is outside this project's control. For ordinary browsing, URML does not add to that, does not read it, and does not receive it. For a contact-form submission, Netlify additionally receives and stores what you submitted, as described above. Netlify's own data handling is in [Netlify's privacy policy](https://www.netlify.com/privacy/).

We spell this out rather than claim a tidy "zero data" because the honest version is more useful than the flattering one.

## Verify it yourself

The entire site source is public at [github.com/URML-MARS/urml-website](https://github.com/URML-MARS/urml-website). The no-third-party-requests property is enforced by the Content-Security-Policy in `netlify.toml` and is checkable in any browser's developer tools: load any page, open the Network tab, confirm every request goes to this domain and nowhere else. The contact form posts to this same origin (Netlify intercepts it); it does not call out to anyone else.

Trust is the most valuable thing an open standard has and the easiest to lose. Collecting only what you deliberately hand over, and saying so plainly, is how you keep it.

## Changes

If this ever changes, the change lands in the public repository first, with the reason, before it is live. There is no quiet version of this page.
