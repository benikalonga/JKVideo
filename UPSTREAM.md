# Upstream / Attribution

This repository is a copy of **[tiajinsha/JKVideo](https://github.com/tiajinsha/JKVideo)**, used for an AI code-review research project.

- Original repository: https://github.com/tiajinsha/JKVideo
- Copied from branch `master` at commit [`3592d036b193`](https://github.com/tiajinsha/JKVideo/commit/3592d036b1930af19d78e4a08bf3e60399c54467) on 2026-10-31
- License: MIT. The original [LICENSE](./LICENSE) file is kept unchanged. All copyright belongs to the original authors.
- Full git history and original commit authorship are preserved.

Please send issues and contributions to the original project.

## Changes from the original

- Secrets, API keys, account IDs and personal data (emails, phone numbers, names) were replaced with placeholders such as `your_email@fakeemail.com`, `0810000000`, `YOUR_NAME` and `00000000-0000-0000-0000-000000000000`, across the whole git history.
- Personal email addresses in commit metadata were replaced with GitHub no-reply addresses or a placeholder. Author names are kept.
- AI agent configuration files (`.claude/`, `.agents/`, `.codex/`, `AGENTS.md`, `CLAUDE.md`, `.mcp.json`) were removed.
- All code comments, UI strings and documentation were translated to English. Non-English text that the code must match at runtime (for example server messages or test data for charset decoding) is kept as `\uXXXX` escapes with an English comment.
- Screenshots, generated output folders and machine-specific scripts were removed, along with README references to them.
- Automation was removed to keep this a plain source repository: CI/CD workflows (GitHub Actions, EAS workflows, Dependabot), helper/build/release scripts, editor and agent tool configs, and package.json scripts that pointed at removed files. Test suites are kept.
- The original LICENSE and its copyright notice are unchanged.
