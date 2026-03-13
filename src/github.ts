import { Octokit } from "octokit";
import { GeminiAnalysisResult } from "./types";

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(token: string, repository: string) {
    this.octokit = new Octokit({ auth: token });
    const [owner, repo] = repository.split("/");
    this.owner = owner;
    this.repo = repo;
  }

  async createIssue(result: GeminiAnalysisResult, slackLink?: string): Promise<any> {
    const labelMap: Record<string, string> = {
      "[Feature]": "[Feature]",
      "[Clarify]": "[Q]",
      "[Dependency]": "[Dependency]",
      "[Estimate]": "[Estimate]",
      "[Out of Scope]": "[Out of Scope]",
    };

    let category = result.category;
    if (result.is_ambiguous || category === "[Clarify]") {
      category = "[Clarify]";
    }

    const label = labelMap[category] || category;

    let body = `## Description\n${result.description}\n\n`;

    if (category === "[Feature]" && result.acceptance_criteria) {
      body += `## Acceptance Criteria\n${result.acceptance_criteria}\n\n`;
    }

    if ((result.is_ambiguous || category === "[Clarify]") && result.missing_info.length > 0) {
      body += `## Missing Information\n`;
      result.missing_info.forEach((info) => {
        body += `- ${info}\n`;
      });
      body += `\n`;
    }

    if (slackLink) {
      body += `## Traceability\n- [Slack Message](${slackLink})\n\n`;
    }

    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: `${category} ${result.title}`,
        body,
        labels: [label],
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create GitHub issue:", error);
      throw error;
    }
  }

  async calculateTotalSP(): Promise<number> {
    try {
      const issues = await this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
        owner: this.owner,
        repo: this.repo,
        state: "open",
      });

      let totalSP = 0;
      for (const issue of issues) {
        // Skip pull requests
        if (issue.pull_request) continue;

        for (const label of issue.labels) {
          const labelName = typeof label === "string" ? label : label.name;
          if (labelName) {
            const match = labelName.match(/^SP:\s*(\d+)$/i);
            if (match) {
              totalSP += parseInt(match[1], 10);
            }
          }
        }
      }
      return totalSP;
    } catch (error) {
      console.error("Failed to calculate total SP:", error);
      throw error;
    }
  }
}
