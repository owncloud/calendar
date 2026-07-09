# Security Policy

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Please report security issues responsibly via:
**<https://security.owncloud.com>**

You can also report vulnerabilities through our YesWeHack bug bounty program:
**<https://yeswehack.com/programs/owncloud-bug-bounty-program>**

## Known issues / accepted risks

The following Dependabot advisories remain open because no upstream fix is
available (or applying one would break the build). They are tracked and
accepted; none is remotely exploitable in a way that affects shipped users
beyond the AngularJS items noted below.

### Shipped runtime — AngularJS (EOL)

- **`angular` / `angular-sanitize` (≤ 1.8.3)** — multiple advisories (ReDoS,
  content-security-policy bypass, incomplete sanitization). AngularJS reached
  end-of-life in January 2022 and **no patched release will ever be published**.
  These are the only advisories affecting shipped application code. Mitigation
  is a migration off AngularJS, which is out of scope for the ownCloud 11
  release line and tracked separately.

### Build-time only — no shipped impact

These are transitive dependencies of the build/test toolchain (gulp, karma,
babel, phantomjs). They are **not present in the app tarball** and cannot be
reached at runtime.

- **`babel-traverse`, `lodash.template`, `request`** — no upstream fix
  available (`request` is deprecated; the others have no patched line).
- **`uuid` (< 11.1.1), `tough-cookie` (< 4.1.3)** — pulled exclusively by the
  deprecated `request` package. The patched versions require major upgrades that
  `request` does not support, so they cannot be bumped without removing
  `request` (dead build tooling).

Other build-time transitive advisories that *do* have a compatible fix are
pinned to patched versions via the `resolutions` block in `package.json`.
