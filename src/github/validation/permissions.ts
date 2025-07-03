import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";
import type { Octokit } from "@octokit/rest";

/**
 * Check if the actor has write permissions to the repository
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<boolean> {
  const { repository, actor } = context;

  try {
    core.info(`Checking permissions for actor: ${actor}`);

    // For GitHub Apps (like claude-yolo[bot]), check if we can perform write operations
    if (actor.endsWith("[bot]")) {
      core.info(`GitHub App detected: ${actor}, checking app installation`);

      try {
        // Try to get the repository to verify the app has access
        await octokit.repos.get({
          owner: repository.owner,
          repo: repository.repo,
        });

        core.info(`App has repository access: ${actor}`);
        return true;
      } catch (error) {
        core.warning(`App lacks repository access: ${error}`);
        return false;
      }
    }

    // For human users, check permissions using the collaborator endpoint
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: actor,
    });

    const permissionLevel = response.data.permission;
    core.info(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      core.info(`Actor has write access: ${permissionLevel}`);
      return true;
    } else {
      core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    core.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}
