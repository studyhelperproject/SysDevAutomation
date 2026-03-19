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

  setRepo(repoName: string) {
    this.repo = repoName;
  }

  async createRepository(name: string): Promise<string> {
    try {
      // First, try to get the authenticated user to see if owner is the same
      const { data: user } = await this.octokit.rest.users.getAuthenticated();

      let response;
      if (user.login === this.owner) {
        response = await this.octokit.rest.repos.createForAuthenticatedUser({
          name,
          private: true,
        });
      } else {
        response = await this.octokit.rest.repos.createInOrg({
          org: this.owner,
          name,
          private: true,
        });
      }
      return response.data.full_name;
    } catch (error) {
      console.error("Failed to create GitHub repository:", error);
      throw error;
    }
  }

  private async ensureLabelExists(name: string, color: string): Promise<void> {
    try {
      await this.octokit.rest.issues.getLabel({
        owner: this.owner,
        repo: this.repo,
        name: name,
      });
    } catch (error: any) {
      if (error.status === 404) {
        try {
          await this.octokit.rest.issues.createLabel({
            owner: this.owner,
            repo: this.repo,
            name: name,
            color: color,
          });
        } catch (createError) {
          console.error(`Failed to create label ${name}:`, createError);
        }
      } else {
        console.error(`Failed to get label ${name}:`, error);
      }
    }
  }

  async ensureLabelsExist(): Promise<void> {
    const labelsToCreate = [
      { name: "[Feature]", color: "a2eeef" },
      { name: "[Q]", color: "d73a4a" },
      { name: "[Dependency]", color: "0075ca" },
      { name: "[Estimate]", color: "cfd3d7" },
      { name: "[Out of Scope]", color: "ffffff" },
      { name: "SP: 1", color: "006b75" },
      { name: "SP: 2", color: "006b75" },
      { name: "SP: 3", color: "006b75" },
      { name: "SP: 5", color: "006b75" },
      { name: "SP: 8", color: "006b75" },
      { name: "assign-to-jules", color: "fbca04" },
    ];

    for (const label of labelsToCreate) {
      await this.ensureLabelExists(label.name, label.color);
    }
  }

  private async prepareIssueData(result: GeminiAnalysisResult, slackLink?: string) {
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

    if (category === "[Feature]") {
      await this.ensureLabelExists("assign-to-jules", "fbca04");
      labels.push("assign-to-jules");
    }

    return {
      title: `${category} ${result.title}`,
      body,
      labels,
      category,
    };
  }

  async createIssue(result: GeminiAnalysisResult, slackLink?: string): Promise<any> {
    const { title, body, labels } = await this.prepareIssueData(result, slackLink);

    try {
      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create GitHub issue:", error);
      throw error;
    }
  }

  async updateIssue(issueNumber: number, result: GeminiAnalysisResult, slackLink?: string): Promise<any> {
    const { title, body, labels } = await this.prepareIssueData(result, slackLink);

    try {
      const response = await this.octokit.rest.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        title,
        body,
        labels,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to update GitHub issue #${issueNumber}:`, error);
      throw error;
    }
  }

  async addComment(issueNumber: number, commentBody: string): Promise<any> {
    try {
      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body: commentBody,
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to add comment to GitHub issue #${issueNumber}:`, error);
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
          number: issue.number,
          title: issue.title,
          body: issue.body,
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
