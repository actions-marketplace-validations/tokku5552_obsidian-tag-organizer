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
    - cron: "0 0 * * *" # Runs daily
  workflow_dispatch: # Manual execution also possible

jobs:
  organize-tags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: your-username/obsidian-tag-organizer@v1
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          target-folder: "notes"
          exclude-folders: "drafts,templates"
          forbidden-tags: "draft,temp"
          model: "gpt-4"
          temperature: "0.7"
```

### 2. Required Configuration

#### Required Parameters

- `openai-api-key`: OpenAI API key (recommended to store in GitHub Secrets)

#### Optional Parameters

- `target-folder`: Target folder for tag organization (default: ".")
- `exclude-folders`: Folders to exclude (comma-separated)
- `forbidden-tags`: Tags to forbid (comma-separated)
- `model`: OpenAI model to use (default: "gpt-4")
- `temperature`: OpenAI API temperature parameter (default: 0.7)

## Examples

### Basic Usage

```yaml
- uses: your-username/obsidian-tag-organizer@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Customized Example

```yaml
- uses: your-username/obsidian-tag-organizer@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    target-folder: "my-notes"
    exclude-folders: "archive,private"
    forbidden-tags: "draft,temp,test"
    model: "gpt-3.5-turbo"
    temperature: "0.5"
```

## License

MIT License

## Contributing

Pull requests and issues are welcome!
