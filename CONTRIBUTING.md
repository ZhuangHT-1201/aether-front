# Contributing to Aether Front

Thanks for helping improve Aether Front. The project is intentionally small and dependency-free, so new contributions should preserve that spirit unless there is a strong reason to change it.

## Local development

```bash
git clone https://github.com/ZhuangHT-1201/aether-front.git
cd aether-front
npm start
```

Open `http://127.0.0.1:8080`.

Before submitting a pull request:

1. Run `npm run check`.
2. Test the affected flow in a browser.
3. Keep the existing visual language and interaction model.
4. Update the README when behavior or controls change.

## Bug reports

Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser and operating system
- A screenshot or short recording when useful

## Pull requests

- Keep pull requests focused.
- Explain the gameplay or technical impact.
- Avoid adding third-party runtime dependencies for small visual features.
- Do not commit generated local files, logs, credentials, or editor-specific settings.

## Gameplay principles

- A new player should understand the first objective without reading an external guide.
- Every order should produce clear visual or audio feedback.
- Combat should remain readable at normal zoom.
- Depth should come from positioning and timing, not hidden rules.

By contributing, you agree that your contribution may be distributed under the repository's MIT License.
