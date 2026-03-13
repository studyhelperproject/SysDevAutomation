import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const MAPPING_FILE = path.join(DATA_DIR, "channel_mapping.json");

export interface ChannelMapping {
  [channelId: string]: string; // channelId -> fullRepoName (owner/repo)
}

export class Storage {
  private mapping: ChannelMapping = {};

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(MAPPING_FILE)) {
      try {
        const data = fs.readFileSync(MAPPING_FILE, "utf-8");
        this.mapping = JSON.parse(data);
      } catch (error) {
        console.error("Failed to load channel mapping:", error);
        this.mapping = {};
      }
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(MAPPING_FILE, JSON.stringify(this.mapping, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save channel mapping:", error);
    }
  }

  getRepo(channelId: string): string | undefined {
    return this.mapping[channelId];
  }

  setRepo(channelId: string, repoName: string) {
    this.mapping[channelId] = repoName;
    this.save();
  }
}

export const storage = new Storage();
