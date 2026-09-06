# Udemy Course Template Manager — Web Version

Responsive, static, GitHub Pages-compatible version of the desktop Course Template Manager.

## Behavior

- Works on phone, tablet, and laptop/desktop.
- Uses `udm_course_prompt.txt` as the source template.
- Replaces only the known course placeholders.
- Generates the complete version in browser memory.
- Copies individual sections or the entire generated version to the clipboard.
- Does **not** create or store generated TXT versions.
- Does **not** require a backend, database, Node.js server, or Python runtime.
- Importing/downloading `course_info.json` is optional and is initiated by the user.

## GitHub Pages

1. Put the contents of this folder in the repository root.
2. Push to `main`.
3. In GitHub: **Settings → Pages → Source: GitHub Actions**.
4. The included `.github/workflows/deploy.yml` deploys the static site.

The generated output never leaves the browser unless the user explicitly copies it or otherwise uses browser functionality.
