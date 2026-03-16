import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { Firestore } from "@google-cloud/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const MAPPING_FILE = path.join(DATA_DIR, "channel_mapping.json");

export interface ChannelMapping {
  [channelId: string]: string; // channelId -> fullRepoName (owner/repo)
}

export interface IStorage {
  getRepo(channelId: string): Promise<string | undefined>;
  setRepo(channelId: string, repoName: string): Promise<void>;
}

export class FileStorage implements IStorage {
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

  async getRepo(channelId: string): Promise<string | undefined> {
    return this.mapping[channelId];
  }

  async setRepo(channelId: string, repoName: string): Promise<void> {
    this.mapping[channelId] = repoName;
    this.save();
  }
}

export class FirestoreStorage implements IStorage {
  private db: Firestore;
  private collectionName = "channel_mappings";

  constructor() {
    this.db = new Firestore();
  }

  async getRepo(channelId: string): Promise<string | undefined> {
    const doc = await this.db.collection(this.collectionName).doc(channelId).get();
    if (!doc.exists) {
      return undefined;
    }
    return doc.data()?.repoName;
  }

  async setRepo(channelId: string, repoName: string): Promise<void> {
    await this.db.collection(this.collectionName).doc(channelId).set({
      repoName,
      updatedAt: new Date().toISOString(),
    });
  }
}

const useFirestore = process.env.USE_FIRESTORE === "true";
export const storage: IStorage = useFirestore ? new FirestoreStorage() : new FileStorage();
