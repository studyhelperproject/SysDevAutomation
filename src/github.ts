import { Octokit } from "octokit";
import { GeminiAnalysisResult } from "./types.js";
import yaml from "js-yaml";

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

    const labels = [label];
    if (result.type) labels.push(`Type: ${result.type}`);
    if (result.status) labels.push(`Status: ${result.status}`);
    if (result.priority) labels.push(`Priority: ${result.priority}`);

    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: `${category} ${result.title}`,
        body,
        labels: labels,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create GitHub issue:", error);
      throw error;
    }
  }

  async getProjectContext(): Promise<string> {
    try {
      const issues = await this.octokit.paginate(this.octokit.rest.issues.listForRepo, {
        owner: this.owner,
        repo: this.repo,
        state: "open",
      });

      const snapshot = issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => ({
          title: issue.title,
          labels: issue.labels.map((l: any) => (typeof l === "string" ? l : l.name)),
        }));

      return yaml.dump(snapshot, { indent: 2 });
    } catch (error) {
      console.error("Failed to fetch project context:", error);
      return "";
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
