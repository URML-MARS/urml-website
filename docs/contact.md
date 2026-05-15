# Contact

URML is in Phase 0, a small project working in public. Pick whichever channel fits.

## Technical: GitHub

For anything code, spec, conformance, or registry related, open an issue. It is the fastest path and it stays public so others benefit from the answer.

[github.com/URML-MARS/URML/issues](https://github.com/URML-MARS/URML/issues)

## Anything else

For partnership, press, procurement, or runtime-listing questions, use the form below. It reaches the maintainer directly.

## Send a message here

This form posts to Netlify, the host of this site. It is not a third-party widget and it sets no cookies or trackers. What you type below (your message, and the email you give for a reply) is sent to Netlify, stored in the project's Netlify dashboard, and delivered to the maintainer. Nothing more is collected. See the [privacy page](privacy.md) for the full statement.

<form class="urml-contact-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/contact-sent/">
  <input type="hidden" name="form-name" value="contact" />
  <p class="urml-hp">
    <label>Leave this field empty if you are human: <input name="bot-field" tabindex="-1" autocomplete="off" /></label>
  </p>
  <div class="field">
    <label for="cf-name">Your name <span class="opt">(optional)</span></label>
    <input id="cf-name" type="text" name="name" autocomplete="name" maxlength="100" placeholder="Jane Roboticist" />
  </div>
  <div class="field">
    <label for="cf-email">Email <span class="req" aria-hidden="true">*</span></label>
    <input id="cf-email" type="email" name="email" required autocomplete="email" maxlength="254" placeholder="you@example.com" aria-describedby="cf-email-hint" />
    <small id="cf-email-hint" class="hint">So we can reply. Used only to answer you, stored only in the Netlify dashboard.</small>
  </div>
  <div class="field">
    <label for="cf-message">Message <span class="req" aria-hidden="true">*</span></label>
    <textarea id="cf-message" name="message" required minlength="10" maxlength="4000" rows="7" placeholder="What would you like to discuss?" aria-describedby="cf-message-hint"></textarea>
    <small id="cf-message-hint" class="hint">At least a sentence (10 characters), up to 4000.</small>
  </div>
  <button type="submit">Send message</button>
  <p class="urml-form-foot">Fields marked <span class="req">*</span> are required. The browser blocks sending until the email is valid and the message is long enough. No data leaves your browser until you press Send.</p>
</form>

If the form does not suit you, the GitHub issue tracker above works for anything that can be public.
