import { GitHubClient } from "./github.js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function aggregateSP() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPO;

  if (!token || !repository) {
    console.error("GITHUB_TOKEN or GITHUB_REPO is not set in environment variables.");
    process.exit(1);
  }

  const githubClient = new GitHubClient(token, repository);

  try {
    const totalSP = await githubClient.calculateTotalSP();
    console.log(`Total Story Points: ${totalSP}`);

    const readmePath = path.join(__dirname, "../README.md");
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, "utf-8");
      const startMarker = "<!-- TOTAL_SP_START -->";
      const endMarker = "<!-- TOTAL_SP_END -->";

      const startIndex = readmeContent.indexOf(startMarker);
      const endIndex = readmeContent.indexOf(endMarker);

      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        const updatedContent =
          readmeContent.substring(0, startIndex + startMarker.length) +
          `**Total Story Points: ${totalSP}**` +
          readmeContent.substring(endIndex);

        fs.writeFileSync(readmePath, updatedContent, "utf-8");
        console.log("README.md updated with total SP.");
      } else {
        console.log("SP markers not found in README.md. Skipping update.");
      }
    } else {
      console.error("README.md not found.");
    }
  } catch (error) {
    console.error("Error during SP aggregation:", error);
    process.exit(1);
  }
}

aggregateSP();
