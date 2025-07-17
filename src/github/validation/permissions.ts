import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";
import type { Octokit } from "@octokit/rest";

/**
 * Return the GitHub user type (User, Bot, Organization, ...)
 */
async function getActorType(octokit: Octokit, actor: string): Promise<string | null> {
  try {
    const { data } = await octokit.users.getByUsername({ username: actor });
    return data.type;
  } catch (error) {
    core.warning(`Failed to get user data for ${actor}: ${error}`);
    return null;
  }
}

/**
 * Determine whether the supplied token grants **write‑level** access to the target repository.
 *
 * Why we don't call `GET /repos/{owner}/{repo}/installation}` anymore
 * ------------------------------------------------------------------
 * That endpoint *requires* a **JWT** (or the *app* token) and will 401 when we call it
 * with an *installation* access token.  Using the simpler `GET /repos/{owner}/{repo}`
 * lets us inspect the `permissions` object of the authenticated principal (human,
 * PAT, or installation) without a second token.
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<boolean> {
  const { repository, actor } = context;

  core.info(`Checking write permissions for actor: ${actor}`);

  // 1. If the token owner is a human user, rely on the collaborator permission level.
  const actorType = await getActorType(octokit, actor);
  if (actorType !== "Bot") {
    try {
      const { data } = await octokit.repos.getCollaboratorPermissionLevel({
        owner: repository.owner,
        repo: repository.repo,
        username: actor,
      });

      const level = data.permission;
      core.info(`Human collaborator permission level: ${level}`);
      return level === "admin" || level === "write";
    } catch (error) {
      core.warning(`Unable to fetch collaborator level for ${actor}: ${error}`);
    }
  }

  /* 2. For GitHub Apps / Bots — or when fallback above fails —
   *    just ask the repository API what *this token* can do.
   *    The `permissions` field will contain booleans for
   *        { admin, maintain, push, triage, pull }.
   *    `push` ~ write, `admin` ~ admin.
   */
  try {
    const { data: repo } = await octokit.repos.get({
      owner: repository.owner,
      repo: repository.repo,
    });

    const perms = repo.permissions || {};
    const hasWrite = Boolean(perms.admin || perms.push || perms.maintain);

    core.info(`Token repo permissions → admin:${perms.admin} push:${perms.push} maintain:${perms.maintain}`);
    if (hasWrite) core.info("Token has write‑level access via repo.permissions");
    else core.warning("Token lacks write‑level access via repo.permissions");

    return hasWrite;
  } catch (error) {
    core.error(`Failed to inspect repo permissions with current token: ${error}`);
    return false;
  }
}
