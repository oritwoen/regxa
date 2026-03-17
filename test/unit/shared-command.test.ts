import consola from "consola";
import { withErrorHandling } from "../../src/commands/shared.ts";
import { HTTPError, RateLimitError } from "../../src/core/errors.ts";

describe("withErrorHandling", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(consola, "error").mockImplementation(() => undefined);
    infoSpy = vi.spyOn(consola, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should print a clean message for RateLimitError", async () => {
    await withErrorHandling(async () => {
      throw new RateLimitError(120);
    });

    expect(errorSpy).toHaveBeenCalledWith("Rate limited by registry. Retry after 120s");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should print a clean message for HTTPError", async () => {
    await withErrorHandling(async () => {
      throw new HTTPError(403, "https://registry.npmjs.org/lodash", "Forbidden");
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Registry request failed: HTTP 403 (https://registry.npmjs.org/lodash)",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should suggest retrying later for server errors", async () => {
    await withErrorHandling(async () => {
      throw new HTTPError(503, "https://registry.npmjs.org/lodash", "Service Unavailable");
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      "The registry may be temporarily unavailable. Try again later.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("should rethrow unknown errors", async () => {
    await expect(
      withErrorHandling(async () => {
        throw new TypeError("something unexpected");
      }),
    ).rejects.toThrow("something unexpected");
  });
});
