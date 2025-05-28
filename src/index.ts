import { OpenAI } from 'openai';
import { parseInputs } from './config';
import { getFileList, getTargetFiles, processFile } from './services/processService';

async function main(): Promise<void> {
  try {
    const inputs = parseInputs();
    const openai = new OpenAI({
      apiKey: inputs.openaiApiKey,
    });

    console.log('Starting tag organization...');
    console.log(`Target folder: ${inputs.targetFolder}`);
    console.log(`Exclude folders: ${inputs.excludeFolders.join(', ')}`);
    console.log(`Forbidden tags: ${inputs.forbiddenTags.join(', ')}`);
    console.log(`Skip invalid front matter: ${inputs.skipInvalidFrontmatter}\n`);

    // ファイル一覧を取得
    const files = await getFileList(inputs.targetFolder, inputs.excludeFolders);

    // 対象ファイルの特定
    const targetFiles = await getTargetFiles(files, inputs.skipInvalidFrontmatter);

    // ファイルのタグ更新
    let prosessedFileCount = 0;
    const MAX_FILES = 5;
    let reachedMaxFiles = false;
    for (const targetFile of targetFiles) {
      const changes = await processFile(
        targetFile.filePath,
        targetFile.content,
        targetFile.originalFrontMatter,
        openai,
        inputs.forbiddenTags,
        inputs.model,
        inputs.temperature
      );
      prosessedFileCount++;
      if (prosessedFileCount >= MAX_FILES) {
        reachedMaxFiles = true;
        break;
      }
      if (changes && changes.length > 0) {
        changes.forEach((change) => {
          console.log(`${change.file}: ${change.oldTag} -> ${change.newTag}`);
        });
      } else {
        console.log(`No changes made to ${targetFile.filePath}`);
      }
    }
    if (reachedMaxFiles) {
      console.log(`\nReached maximum file limit (${MAX_FILES}). Stopping processing.`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
