export interface ScanOptions {
  maxFiles?: number;
  maxFileSizeBytes?: number;
  ignoreNames?: string[];
}

export interface CodebaseFile {
  relativePath: string;
  language: string;
  sizeBytes: number;
  imports: string[];
  exports: string[];
}

export interface FrameworkSignal {
  name: string;
  evidence: string[];
}

export interface ModuleSummary {
  name: string;
  role: string;
  files: string[];
  imports: string[];
}

export interface CodebaseScan {
  rootPath: string;
  scannedAt: string;
  files: CodebaseFile[];
  languages: Record<string, number>;
  frameworks: FrameworkSignal[];
  modules: ModuleSummary[];
}
