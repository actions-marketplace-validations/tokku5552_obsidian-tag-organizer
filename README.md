# Obsidian Tag Organizer

A GitHub Action that automatically organizes tags in Obsidian. It uses the OpenAI API to maintain tag consistency and suggest better tag structures.

## Features

- Extract tags from Obsidian files in specified folders
- Suggest tag improvements using OpenAI API
- Customizable settings (target folders, excluded folders, forbidden tags, etc.)
- Track tag change history

## Usage

### 1. Workflow Setup

Add the following workflow to `.github/workflows/tag-organizer.yml`:

```yaml
name: Organize Tags

on:
  schedule:
    - cron: '0 0 * * *' # Runs daily
  workflow_dispatch: # Manual execution also possible

jobs:
  organize-tags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tokku5552/obsidian-tag-organizer@v0.1.0
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          target-folder: 'notes'
          exclude-folders: |
            - drafts
            - templates
            - private
          forbidden-tags: |
            - draft
            - temp
            - test
          model: 'gpt-4'
          temperature: '0.7'
```

### 2. Required Configuration

#### Required Parameters

- `openai-api-key`: OpenAI API key (recommended to store in GitHub Secrets)

#### Optional Parameters

- `target-folder`: Target folder for tag organization (default: ".")
- `exclude-folders`: Folders to exclude (YAML list format)
- `forbidden-tags`: Tags to forbid (YAML list format)
- `model`: OpenAI model to use (default: "gpt-4")
- `temperature`: OpenAI API temperature parameter (default: 0.7)

## Development

### Prerequisites

- Node.js (see [.node-version](.node-version) for the required version)
- Yarn
- Git

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/tokudashinnosuke/obsidian-tag-organizer.git
   cd obsidian-tag-organizer
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Build the project:
   ```bash
   yarn build
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

### Git Hooks

The project uses Git hooks to automatically:

- Format code with Prettier
- Check code style with ESLint
- Verify the build succeeds
  when committing TypeScript files.

For more detailed information about development and contributing, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Examples

### Basic Usage

```yaml
- uses: tokku5552/obsidian-tag-organizer@v0.1.0
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Customized Example

```yaml
- uses: tokku5552/obsidian-tag-organizer@v0.1.0
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    target-folder: 'my-notes'
    exclude-folders: |
      - archive
      - private
      - drafts
    forbidden-tags: |
      - draft
      - temp
      - test
    model: 'gpt-3.5-turbo'
    temperature: '0.5'
```

## License

This project is licensed under the MIT License.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.
