# InnerVoice Monorepo

This repository hosts the InnerVoice monorepo containing applications, shared modules, and documentation.

## Structure

```
repo/
  app/        # Web application workspace
  native/     # React Native / mobile workspace
  core/       # Shared TypeScript utilities and domain logic
  persona/    # AI persona definitions and assets
  scripts/    # Automation and developer tooling
  docs/       # Documentation sources
```

Each workspace is managed via Yarn workspaces defined in the root `package.json`.

## Getting Started

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Prepare Git hooks:

   ```bash
   yarn prepare
   ```

3. Run linters and formatters:

   ```bash
   yarn lint
   yarn format
   ```

4. Run TypeScript checks:

   ```bash
   yarn typecheck
   ```

## Tooling

- **TypeScript** configuration shared via `tsconfig.base.json`.
- **ESLint** configured with TypeScript, React, accessibility, and import-order rules.
- **Prettier** handles code formatting with repository-wide defaults.
- **Husky** Git hooks run linting and commit message validation.
- **Commitlint** ensures conventional commit messages.

## License

This project is licensed under the [MIT License](./LICENSE).
