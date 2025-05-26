# Obsidian Tag Organizer

Obsidian のタグを自動的に整理する GitHub Actions です。OpenAI API を使用して、タグの一貫性を保ち、より良いタグ構造を提案します。

## 機能

- 指定したフォルダ内の Obsidian ファイルからタグを抽出
- OpenAI API を使用してタグの改善を提案
- カスタマイズ可能な設定（対象フォルダ、除外フォルダ、禁止タグなど）
- タグの変更履歴の追跡

## 使用方法

### 1. ワークフローの設定

`.github/workflows/tag-organizer.yml`に以下のようなワークフローを追加します：

```yaml
name: Organize Tags

on:
  schedule:
    - cron: "0 0 * * *" # 毎日実行
  workflow_dispatch: # 手動実行も可能

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

### 2. 必要な設定

#### 必須パラメータ

- `openai-api-key`: OpenAI API キー（GitHub Secrets に保存することを推奨）

#### オプションパラメータ

- `target-folder`: タグ整理の対象フォルダ（デフォルト: "."）
- `exclude-folders`: 除外するフォルダ（カンマ区切り）
- `forbidden-tags`: 使用を禁止するタグ（カンマ区切り）
- `model`: 使用する OpenAI モデル（デフォルト: "gpt-4"）
- `temperature`: OpenAI API の温度パラメータ（デフォルト: 0.7）

## 使用例

### 基本的な使用例

```yaml
- uses: your-username/obsidian-tag-organizer@v1
  with:
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### カスタマイズ例

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

## ライセンス

MIT License

## 貢献

プルリクエストやイシューは大歓迎です！
