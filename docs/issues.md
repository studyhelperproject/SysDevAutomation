# Proposed GitHub Issues

## Issue 1: Project Scaffolding and Environment Setup
**Labels**: `chore`, `setup`
**Description**:
Initialize the repository with the necessary directory structure and dependency configurations.
- Setup Node.js environment.
- Install required dependencies (Bolt for Slack, Octokit for GitHub, Google Generative AI SDK).
- Configure environment variable templates (`.env.example`).
**Acceptance Criteria**:
- `package.json` is initialized.
- Directory structure (`src/`, `prompts/`, `templates/`) is created.
- Dependencies are installed.

---

## Issue 2: Slack App Integration (Event Subscriptions)
**Labels**: `enhancement`, `slack`
**Description**:
Implement the Slack interface to receive messages/mentions from users.
- Configure Slack Bolt for Node.js.
- Setup `app_mention` and `message.im` event handlers.
- Extract message text, user info, and message link/timestamp for traceability.
**Acceptance Criteria**:
- The application can receive a mention in Slack.
- The raw message data is logged/captured correctly.

---

## Issue 3: Gemini Analysis Engine (System Prompt & JSON Output)
**Labels**: `enhancement`, `ai`
**Description**:
Implement the core logic to transform Slack messages into structured JSON using Gemini API.
- Define the system prompt based on the PM/Analyst role.
- Implement a function to call Gemini API with the system prompt and user input.
- Enforce JSON output format.
**Acceptance Criteria**:
- Gemini returns a structured JSON containing: `category`, `title`, `description`, `acceptance_criteria`, `is_ambiguous`, `missing_info`.

---

## Issue 4: GitHub API Client (Issue Creation & Labels)
**Labels**: `enhancement`, `github`
**Description**:
Implement the GitHub API client to create and manage Issues based on Gemini's output.
- Use Octokit to interact with GitHub API.
- Map Gemini's categories to GitHub labels (e.g., `[Feature]`, `[Q]`).
- Format the issue body with "Given/When/Then" for features.
- Support adding issues to a specific GitHub Project (optional but recommended).
**Acceptance Criteria**:
- Issues are correctly created in the repository with appropriate labels and descriptions.

---

## Issue 5: Workflow Integration (Slack -> Gemini -> GitHub)
**Labels**: `enhancement`, `workflow`
**Description**:
Connect the components to form the full pipeline.
- Input (Slack) -> Process (Gemini) -> Output (GitHub).
- Ensure traceability by including the Slack message link in the GitHub Issue.
**Acceptance Criteria**:
- Sending a message to the Slack bot results in a GitHub Issue being created automatically.

---

## Issue 6: Requirement Refinement Logic (Ambiguity Detection)
**Labels**: `enhancement`, `ai`
**Description**:
Refine the Gemini prompt and logic to strictly detect ambiguity.
- Implement the "Ambiguity Exclusion" rules (detecting "as appropriate", "nicely", etc.).
- If `is_ambiguous` is true, label the issue with `[Q]` or `Clarify`.
- Ensure Gemini provides specific questions to resolve the ambiguity.
**Acceptance Criteria**:
- Messages like "Add login feature" (vague) result in a `Clarify` issue.
- Messages like "Add Google Login" result in a `[Feature]` issue.

---

## Issue 7: Clarification/Reverse-Question Bot (Feedback to Slack)
**Labels**: `enhancement`, `slack`
**Description**:
Send feedback from the system back to the user on Slack.
- If a `Clarify` or `DataRequest` is triggered, notify the user on Slack with the specific questions/requests.
- Provide a link to the created GitHub Issue.
**Acceptance Criteria**:
- The user receives a message on Slack when their input is deemed ambiguous or requires data.

---

## Issue 8: Cost Estimation & SP Label Integration
**Labels**: `enhancement`, `github`
**Description**:
Implement automatic estimation logic based on labels.
- Calculate total SP (Story Points) from Issue labels.
- (Optional) Update a README or Wiki with the current total estimation.
**Acceptance Criteria**:
- A script or action can aggregate SP from labels and report the total.
