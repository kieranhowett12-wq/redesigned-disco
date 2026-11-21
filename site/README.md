# Disco Studio website

A static site in plain HTML, CSS and JavaScript. It has no build step, no dependencies and no server-side code.

## Run locally

```sh
cd site && python3 -m http.server 8000   # http://localhost:8000
```

Opening `index.html` straight from disk also works. Chrome logs harmless font-preload errors over `file://`.

## Security model

There's very little to attack because the site has no backend, database, CMS, cookies or third-party code.

- **Content Security Policy:** `default-src 'none'`. Only same-origin scripts, styles, images and fonts are allowed. There's no inline JS or CSS and no `eval`. Forms can't post anywhere (`form-action 'none'`) and scripts can't make network requests (`connect-src 'none'`).
- **No third parties:** fonts are self-hosted and there's no analytics, CDN or tracking. Visitors' data never leaves your domain.
- **Contact form:** user input is validated, length-limited and stripped of control characters. It only goes into a URL-encoded `mailto:` link and is never written into the page as HTML.
- **Headers** (`_headers` for Netlify/Cloudflare Pages, `vercel.json` for Vercel): CSP with `frame-ancestors 'none'`, HSTS, `nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, a Permissions-Policy that turns off camera, mic, location and similar, plus COOP/CORP.
- `.well-known/security.txt` tells security researchers how to report issues.

GitHub Pages can't set headers. There, only the `<meta>` CSP applies, which can't block framing. Prefer Netlify, Cloudflare Pages or Vercel.

On other hosts (nginx, Apache, S3/CloudFront), copy the headers from `_headers` into the server config.

## Before launch checklist

- [ ] Replace **Disco Studio**, `hello@example.com` (`index.html`, `script.js` `CONTACT_EMAIL`, `privacy.html`) and `security@example.com`.
- [ ] Replace `https://www.example.com` in `index.html`, `privacy.html`, `robots.txt`, `sitemap.xml` and `.well-known/security.txt`.
- [ ] Replace the **sample projects** and **example prices**, then delete the two "sample/example" notes.
- [ ] Have `privacy.html` checked against how you really handle data. It's a template, not legal advice.
- [ ] Regenerate `assets/og-image.png` (1200×630) if the brand changes.
- [ ] Turn on HTTPS, then test at https://securityheaders.com and https://observatory.mozilla.org.
- [ ] Renew `security.txt` `Expires` every year.

## Switching to a form service

To receive enquiries directly (Formspree, Netlify Forms, etc.), set the form's `action`. Allow that service's origin in **both** CSP copies (`form-action`, plus `connect-src` if you submit with `fetch`). Add a honeypot field or the service's spam protection, and update the privacy notice to name the service.
