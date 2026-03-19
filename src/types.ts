export interface GeminiAnalysisResult {
  category: '[Feature]' | '[Clarify]' | '[Dependency]' | '[Estimate]' | '[Out of Scope]';
  title: string;
  description: string;
  acceptance_criteria: string;
  is_ambiguous: boolean;
  missing_info: string[];
  type?: string;
  status?: string;
  priority?: string;
  action: 'create' | 'update' | 'comment';
  issue_number?: number;
}
