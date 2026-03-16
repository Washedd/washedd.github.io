# Portfolio

A simple, responsive single-page portfolio. Hosted on [GitHub Pages](https://pages.github.com/).

**Live site:** After enabling GitHub Pages, your site will be at:
- User/org site: `https://<username>.github.io`
- Project site: `https://<username>.github.io/<repo-name>/`

---

## Deploy to GitHub Pages

1. **Create a repository** on GitHub (e.g. `username.github.io` for a user site, or any name for a project site).

2. **Push this project** to the repo:
   ```bash
   git remote add origin https://github.com/<username>/<repo>.git
   git add .
   git commit -m "Initial portfolio"
   git push -u origin main
   ```
   Use `master` instead of `main` if your default branch is `master`.

3. **Enable GitHub Pages:** In the repo, go to **Settings → Pages**. Under "Build and deployment":
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or `master`), folder **/ (root)**
   - Save. The site will be published in a minute or two.

4. **Update this README** with your actual live URL once the site is live.

---

## Customize

- **index.html:** Replace placeholder text with your name, bio, projects, and contact links.
- **css/style.css:** Adjust `:root` variables (colors, spacing, font) to match your style.

All asset paths are relative, so the site works both locally and when served from a GitHub Pages subpath (e.g. `username.github.io/my-portfolio/`).
