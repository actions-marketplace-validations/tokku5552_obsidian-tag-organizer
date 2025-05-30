# Contributing to Obsidian Tag Organizer

Thank you for your interest in contributing to Obsidian Tag Organizer! This document provides guidelines and instructions for contributing to this project.

## Development Setup

### Prerequisites

- Node.js (see [.node-version](.node-version) for the required version)
- Yarn
- Git

### Initial Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/tokku5552/obsidian-tag-organizer.git
   cd obsidian-tag-organizer
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

### Available Scripts

- `yarn build` - Build the TypeScript code
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues
- `yarn format` - Format code with Prettier
- `yarn format:check` - Check code formatting
- `yarn clean` - Clean build artifacts

## Development Workflow

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

   Note: The project uses Git hooks to automatically check the build when committing TypeScript files. If the build fails, the commit will be rejected.

3. Push your changes to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request from your fork to the main repository.

## Code Style

- We use ESLint and Prettier for code formatting
- Run `yarn lint` and `yarn format` before committing
- Follow the TypeScript best practices
- Write tests for new features
- The project uses Git hooks to automatically:
  - Format code with Prettier
  - Check code style with ESLint
  - Verify the build succeeds
    when committing TypeScript files

## Testing

- Write unit tests for new features
- Ensure all tests pass before submitting a PR
- Maintain or improve the current test coverage (80%)
- Use `yarn test:watch` during development for faster feedback

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation if you're changing functionality
3. Make sure to build the project and commit the `dist/` directory
4. The PR will be merged once you have the sign-off of at least one maintainer
5. Make sure all CI checks pass

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or modifying tests
- `chore:` for maintenance tasks

Example:

```
feat: add support for custom tag patterns
fix: handle empty front matter correctly
docs: update README with new configuration options
```

## Questions or Problems?

If you have any questions or run into any problems, please open an issue in the GitHub repository. We'll do our best to help you get started with contributing to the project.
