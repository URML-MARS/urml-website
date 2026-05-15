# Privacy

This site is built to collect nothing. That is a design constraint, not a marketing line, and you can verify every claim below by reading the source.

## What this site does not do

- No cookies. The site sets none.
- No analytics. No Google Analytics, no Plausible, no anything that counts or profiles visitors.
- No third-party loads. No fonts, scripts, or trackers from other origins. A Content-Security-Policy header blocks any cross-origin request at the browser level, so if a future change tried to add one, it would break visibly instead of leaking quietly.
- No contact form, no newsletter, no email collection. There is no field anywhere on this site that takes your data.
- No JavaScript beyond what the documentation theme ships for on-device search and the light/dark toggle. Neither sends anything anywhere.

## The one honest caveat

This site is hosted on Netlify. Like any web host or CDN, Netlify processes the basic technical metadata needed to serve a page: your IP address, the request time, and the file requested. That happens at the network layer for every site on the internet and is outside this project's control. URML does not add to it, does not read it, and does not receive it. Netlify's own data handling is described in [Netlify's privacy policy](https://www.netlify.com/privacy/).

We mention this rather than claim a tidy "zero data" because the honest version is more useful than the flattering one.

## Verify it yourself

The entire site source is public at [github.com/URML-MARS/urml-website](https://github.com/URML-MARS/urml-website). The no-third-party-requests property is enforced by the Content-Security-Policy in `netlify.toml` and is checkable in any browser's developer tools: load any page, open the Network tab, confirm every request goes to this domain and nowhere else.

Trust is the most valuable thing an open standard has and the easiest to lose. A site that collects nothing is the simplest way to not spend it.

## Changes

If this ever changes, the change lands in the public repository first, with the reason, before it is live. There is no quiet version of this page.
