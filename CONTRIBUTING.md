# Contributing Guide

Thanks for considering a contribution to JKVideo!

---

## Development setup

### Recommended: Dev Build (full features)

```bash
git clone https://github.com/YOUR_USERNAME/JKVideo.git
cd JKVideo
npm install
npx expo run:android   # Requires a connected Android device or a running emulator
```

Dev Build supports native DASH playback (react-native-video) and is required when working on video playback.

### Expo Go (quick UI checks)

```bash
npm install
npx expo start
```

Good for UI components, navigation, the danmaku list and anything else that does not depend on native video decoding.

### Web

```bash
npx expo start --web
```

Web needs a local proxy for image hotlink protection. Start it in a separate terminal:

```bash
npm run proxy   # Runs dev-proxy.js, listens on localhost:3001
```

---

## Commit convention (Conventional Commits)

Use this format:

```
<type>(<scope>): <description>

[optional body]
```

| type | Meaning |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Refactor (no behavior change) |
| `docs` | Documentation |
| `chore` | Build scripts, dependency updates, etc. |
| `style` | Code formatting (no logic change) |
| `perf` | Performance improvement |

Examples:

```
feat(danmaku): add a danmaku font size setting
fix(player): fix DASH MPD parsing crash on Android 12
docs: update the README quick start steps
```

---

## Pull request process

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Develop and test locally
3. Commit following the convention
4. Open a pull request and fill in the template
5. Wait for code review

---

## Rules

- **Never** hard-code account data in the code (SESSDATA, uid, etc.)
- PRs that automate bulk actions or bypass Bilibili's anti-scraping measures are **not accepted**
- For new features, open an issue to discuss first to avoid duplicate work
- When changing API parameters, update the comments in `services/bilibili.ts` as well

---

## Feedback

- Bug reports: [open an issue](https://github.com/YOUR_USERNAME/JKVideo/issues/new?template=bug_report.yml)
- Feature ideas: [open a feature request](https://github.com/YOUR_USERNAME/JKVideo/issues/new?template=feature_request.yml)
- Questions: ask in [Discussions](https://github.com/YOUR_USERNAME/JKVideo/discussions) first
