import ApiGatewaySigner, { HttpMethods, SignedRequestData } from "./index";
import { Jest } from "@jest/environment";

const BASE_URL = "https://example.com";

describe("signRequest", () => {
  let signer: ApiGatewaySigner;
  beforeEach(() => {
    signer = new ApiGatewaySigner({
      endpoint: BASE_URL
    });
  });

  test("headers are created", () => {
    const request = signer.signRequest({
      method: HttpMethods.GET,
      path: "/"
    });

    expect(request.headers).toBeDefined();
    expect(request.headers).toHaveProperty("Accept", "application/json");
    expect(request.headers).toHaveProperty("Authorization");
    expect(request.headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256\sCredential=.*,\s+SignedHeaders=.*,\s+Signature=/
    );
    expect(request.headers).toHaveProperty("Content-Type", "application/json");
    expect(request.headers).toHaveProperty("x-amz-date");
  });

  test("URL is created", () => {
    const request = signer.signRequest({
      method: HttpMethods.GET,
      path: "/"
    });

    expect(request).toHaveProperty("url", BASE_URL + "/");
  });

  test("URL has params", () => {
    const request = signer.signRequest({
      method: HttpMethods.GET,
      path: "/",
      queryParams: {
        query: "TEST_QUERY"
      }
    });

    expect(request).toHaveProperty("url");
    expect(request.url).toMatch(/query=TEST_QUERY$/);
  });

  test("Exponential backoff", async () => {
    const RETRY_COUNT = 3;

    const callback = jest.fn(async (req: SignedRequestData) => {
      throw new Error("Testing");
    });

    const result = await signer.makeRequestWithRetries(
      {
        method: HttpMethods.GET,
        path: "/"
      },
      callback,
      RETRY_COUNT
    );

    expect(callback).toHaveBeenCalledTimes(RETRY_COUNT);
    expect(result).toBeUndefined();
  }, 10000);
});
