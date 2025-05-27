import { OpenAI } from 'openai';
import { parseInputs } from './config';
import { processDirectory } from './services/processService';

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

    const changes = await processDirectory(
      inputs.targetFolder,
      inputs.excludeFolders,
      openai,
      inputs.forbiddenTags,
      inputs.model,
      inputs.temperature,
      inputs.skipInvalidFrontmatter
    );

    if (changes.length > 0) {
      console.log('\nTag changes made:');
      changes.forEach((change) => {
        console.log(`${change.file}: ${change.oldTag} -> ${change.newTag}`);
      });
      process.exit(0);
    } else {
      console.log('\nNo files needed tag updates. All files either:');
      console.log('- Already have 5 or more tags');
      console.log('- Have invalid front matter (and skip-invalid-frontmatter is true)');
      console.log('- Are README files');
      console.log('- Could not be processed due to other issues');
      process.exit(0);
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
