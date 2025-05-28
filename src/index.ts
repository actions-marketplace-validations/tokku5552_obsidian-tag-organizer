import { OpenAI } from 'openai';
import { parseInputs } from './config';
import { getAllFiles, getTargetFiles } from './services/fileService';
import { analyzeContentWithAI } from './infrastructure/openai';
import { replaceFrontMatter } from './services/frontMatterService';
import { tagOrganizer } from './services/tagService';

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
    const filePaths = await getAllFiles(inputs);

    // 対象ファイルの特定
    const targetFiles = await getTargetFiles(filePaths, inputs.skipInvalidFrontmatter);

    // ファイルのタグ更新
    let prosessedFileCount = 0;

    let reachedMaxFiles = false;
    for (const targetFile of targetFiles) {
      const suggestions = await analyzeContentWithAI(openai, targetFile.content, inputs);

      if (!suggestions) {
        console.log(`No suggestions for ${targetFile.filePath}`);
        continue;
      }

      const newTags = tagOrganizer(targetFile, suggestions);

      if (newTags && newTags.length > 0) {
        await replaceFrontMatter(targetFile, newTags);
        newTags.forEach((newTag) => {
          console.log(`${targetFile.filePath}: ${newTag}`);
        });
        prosessedFileCount++;
        if (prosessedFileCount >= inputs.maxFiles) {
          reachedMaxFiles = true;
          break;
        }
      } else {
        console.log(`No changes made to ${targetFile.filePath}`);
      }
    }
    if (reachedMaxFiles) {
      console.log(`\nReached maximum file limit (${inputs.maxFiles}). Stopping processing.`);
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
