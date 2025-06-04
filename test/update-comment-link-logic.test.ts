import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("update-comment-link workflow status detection", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("should detect prepare step failure", () => {
    process.env.PREPARE_SUCCESS = "false";
    process.env.PREPARE_ERROR = "Failed to fetch issue data";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;

    let actionFailed = false;
    let errorDetails: string | undefined;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
      errorDetails = prepareError;
    }

    expect(actionFailed).toBe(true);
    expect(errorDetails).toBe("Failed to fetch issue data");
  });

  test("should detect claude-code step failure when prepare succeeds", () => {
    process.env.PREPARE_SUCCESS = "true";
    process.env.CLAUDE_SUCCESS = "false";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;

    let actionFailed = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else {
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(true);
  });

  test("should detect success when both steps succeed", () => {
    process.env.PREPARE_SUCCESS = "true";
    process.env.CLAUDE_SUCCESS = "true";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;

    let actionFailed = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else {
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(false);
  });

  test("should treat missing CLAUDE_SUCCESS env var as failure", () => {
    process.env.PREPARE_SUCCESS = "true";
    delete process.env.CLAUDE_SUCCESS;

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;

    let actionFailed = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else {
      // When CLAUDE_SUCCESS is undefined, it's not === "true", so claudeSuccess = false
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(true);
  });

  test("should handle undefined PREPARE_SUCCESS as success", () => {
    delete process.env.PREPARE_SUCCESS;
    delete process.env.PREPARE_ERROR;
    process.env.CLAUDE_SUCCESS = "true";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;

    let actionFailed = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else {
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(false);
  });

  test("should detect cancellation when CLAUDE_CANCELLED is true", () => {
    process.env.PREPARE_SUCCESS = "true";
    process.env.CLAUDE_SUCCESS = "false";
    process.env.CLAUDE_CANCELLED = "true";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;
    const isCancelled = process.env.CLAUDE_CANCELLED === "true";

    let actionFailed = false;
    let actionCancelled = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else if (isCancelled) {
      actionCancelled = true;
    } else {
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(false);
    expect(actionCancelled).toBe(true);
  });

  test("should not detect cancellation when CLAUDE_CANCELLED is false", () => {
    process.env.PREPARE_SUCCESS = "true";
    process.env.CLAUDE_SUCCESS = "false";
    process.env.CLAUDE_CANCELLED = "false";

    const prepareSuccess = process.env.PREPARE_SUCCESS !== "false";
    const prepareError = process.env.PREPARE_ERROR;
    const isCancelled = process.env.CLAUDE_CANCELLED === "true";

    let actionFailed = false;
    let actionCancelled = false;

    if (!prepareSuccess && prepareError) {
      actionFailed = true;
    } else if (isCancelled) {
      actionCancelled = true;
    } else {
      const claudeSuccess = process.env.CLAUDE_SUCCESS === "true";
      actionFailed = !claudeSuccess;
    }

    expect(actionFailed).toBe(true);
    expect(actionCancelled).toBe(false);
  });
});
