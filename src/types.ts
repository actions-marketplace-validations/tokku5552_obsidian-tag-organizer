export interface FrontMatter {
  title?: string;
  tags?: string[];
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface Tag {
  name: string;
  count: number;
  files: string[];
}

export interface FileContent {
  path: string;
  content: string;
  tags: string[];
}

export interface TagSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface TagChange {
  file: string;
  oldTag: string;
  newTag: string;
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
