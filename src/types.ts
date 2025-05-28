export interface FrontMatter {
  title?: string;
  tags?: string[];
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface TagSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface ActionInputs {
  openaiApiKey: string;
  targetFolder: string;
  excludeFolders: string[];
  forbiddenTags: string[];
  model: string;
  temperature: number;
  skipInvalidFrontmatter: boolean;
}

export interface TargetFile {
  filePath: string;
  content: string;
  originalFrontMatter: FrontMatter;
}
