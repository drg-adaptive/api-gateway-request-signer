// Taken from https://github.com/AnomalyInnovations/sigV4Client and converted to typescript
// For an example of the original library, see https://serverless-stack.com/chapters/connect-to-api-gateway-with-iam-auth.html

import { LibWordArray, SHA256, HmacSHA256, enc } from "crypto-js";

const encHex = enc.Hex;

export interface RequestSignerConfig {
  accessKey?: string;
  secretKey?: string;
  sessionToken?: string;
  serviceName?: string;
  region?: string;
  defaultAcceptType?: string;
  defaultContentType?: string;
  endpoint: string;
}

export enum HttpMethods {
  GET = "GET",
  POST = "POST"
}

export interface RequestToSign {
  method: HttpMethods;
  path: string;
  queryParams?: any;
  headers?: any;
  body?: any;
}

const AWS_SHA_256 = "AWS4-HMAC-SHA256";
const AWS4_REQUEST = "aws4_request";
const AWS4 = "AWS4";
const X_AMZ_DATE = "x-amz-date";
const X_AMZ_SECURITY_TOKEN = "x-amz-security-token";
const HOST = "host";
const AUTHORIZATION = "Authorization";

const addDefaultConfigValues = (
  config: RequestSignerConfig
): RequestSignerConfig => ({
  ...config,
  ...(!(config.accessKey || config.secretKey || config.sessionToken) && {
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  })
});

function hash(value: string) {
  return SHA256(value); // eslint-disable-line
}

function hexEncode(value: any) {
  return value.toString(encHex);
}

function hmac(secret: string | LibWordArray, value: string | LibWordArray) {
  return HmacSHA256(value, secret, { asBytes: true }); // eslint-disable-line
}

function buildCanonicalRequest(
  method: string,
  path: string,
  queryParams: { [x: string]: string | number | boolean },
  headers: any,
  payload: string
) {
  return (
    method +
    "\n" +
    buildCanonicalUri(path) +
    "\n" +
    buildCanonicalQueryString(queryParams) +
    "\n" +
    buildCanonicalHeaders(headers) +
    "\n" +
    buildCanonicalSignedHeaders(headers) +
    "\n" +
    hexEncode(hash(payload))
  );
}

function hashCanonicalRequest(request: string) {
  return hexEncode(hash(request));
}

function buildCanonicalUri(uri: string) {
  return encodeURI(uri);
}

function buildCanonicalQueryString(queryParams: {
  [x: string]: string | number | boolean;
}) {
  if (Object.keys(queryParams).length < 1) {
    return "";
  }

  let sortedQueryParams = [];
  for (let property in queryParams) {
    if (queryParams.hasOwnProperty(property)) {
      sortedQueryParams.push(property);
    }
  }
  sortedQueryParams.sort();

  let canonicalQueryString = "";
  for (let i = 0; i < sortedQueryParams.length; i++) {
    canonicalQueryString +=
      sortedQueryParams[i] +
      "=" +
      encodeURIComponent(queryParams[sortedQueryParams[i]]) +
      "&";
  }
  return canonicalQueryString.substr(0, canonicalQueryString.length - 1);
}

function buildCanonicalHeaders(headers: { [x: string]: string }) {
  let canonicalHeaders = "";
  let sortedKeys = [];
  for (let property in headers) {
    if (headers.hasOwnProperty(property)) {
      sortedKeys.push(property);
    }
  }
  sortedKeys.sort();

  for (let i = 0; i < sortedKeys.length; i++) {
    canonicalHeaders +=
      sortedKeys[i].toLowerCase() + ":" + headers[sortedKeys[i]] + "\n";
  }
  return canonicalHeaders;
}

function buildCanonicalSignedHeaders(headers: object) {
  let sortedKeys = [];
  for (let property in headers) {
    if (headers.hasOwnProperty(property)) {
      sortedKeys.push(property.toLowerCase());
    }
  }
  sortedKeys.sort();

  return sortedKeys.join(";");
}

function buildStringToSign(
  datetime: string,
  credentialScope: string,
  hashedCanonicalRequest: string
) {
  return (
    AWS_SHA_256 +
    "\n" +
    datetime +
    "\n" +
    credentialScope +
    "\n" +
    hashedCanonicalRequest
  );
}

function buildCredentialScope(
  datetime: string,
  region: string,
  service: string
) {
  return (
    datetime.substr(0, 8) + "/" + region + "/" + service + "/" + AWS4_REQUEST
  );
}

function calculateSigningKey(
  secretKey: string,
  datetime: string,
  region: string | LibWordArray,
  service: string | LibWordArray
) {
  return hmac(
    // @ts-ignore
    hmac(hmac(hmac(AWS4 + secretKey, datetime.substr(0, 8)), region), service),
    AWS4_REQUEST
  );
}

function calculateSignature(
  key: string | LibWordArray,
  stringToSign: string | LibWordArray
) {
  return hexEncode(hmac(key, stringToSign));
}

function extractHostname(url: string) {
  var hostname;

  if (url.indexOf("://") > -1) {
    hostname = url.split("/")[2];
  } else {
    hostname = url.split("/")[0];
  }

  hostname = hostname.split(":")[0];
  hostname = hostname.split("?")[0];

  return hostname;
}

function buildAuthorizationHeader(
  accessKey: string,
  credentialScope: string,
  headers: any,
  signature: string
) {
  return (
    AWS_SHA_256 +
    " Credential=" +
    accessKey +
    "/" +
    credentialScope +
    ", SignedHeaders=" +
    buildCanonicalSignedHeaders(headers) +
    ", Signature=" +
    signature
  );
}

export default class RequestSigner {
  accessKey: string;
  secretKey: string;
  sessionToken: string;
  serviceName: string;
  region: string;
  defaultAcceptType: string;
  defaultContentType: string;
  endpoint: string;
  pathComponent: string;

  constructor(config: RequestSignerConfig) {
    config = addDefaultConfigValues(config);
    const invokeUrl = config.endpoint;

    this.accessKey = config.accessKey;
    this.secretKey = config.secretKey;
    this.sessionToken = config.sessionToken;
    this.serviceName = config.serviceName || "execute-api";
    this.region = config.region || process.env.AWS_REGION || "us-east-1";
    this.defaultAcceptType = config.defaultAcceptType || "application/json";
    this.defaultContentType = config.defaultContentType || "application/json";
    this.endpoint = /(^https?:\/\/[^/]+)/g.exec(invokeUrl)[1];
    this.pathComponent = invokeUrl.substring(this.endpoint.length);

    if (config.accessKey === undefined || config.secretKey === undefined) {
      throw new Error(`An access key and secret key must be provided.`);
    }
  }

  signRequest(request: RequestToSign) {
    const verb = request.method.toUpperCase();
    const path = this.pathComponent + request.path;
    const queryParams = { ...request.queryParams };
    const headers = { ...request.headers };

    // If the user has not specified an override for Content type the use default
    if (headers["Content-Type"] === undefined) {
      headers["Content-Type"] = this.defaultContentType;
    }

    // If the user has not specified an override for Accept type the use default
    if (headers["Accept"] === undefined) {
      headers["Accept"] = this.defaultAcceptType;
    }

    let body = { ...request.body };
    // override request body and set to empty when signing GET requests
    if (request.body === undefined || verb === "GET") {
      body = "";
    } else {
      body = JSON.stringify(body);
    }

    // If there is no body remove the content-type header so it is not
    // included in SigV4 calculation
    if (body === "" || body === undefined || body === null) {
      delete headers["Content-Type"];
    }

    let datetime = new Date()
      .toISOString()
      .replace(/\.\d{3}Z$/, "Z")
      .replace(/[:-]|\.\d{3}/g, "");
    headers[X_AMZ_DATE] = datetime;
    headers[HOST] = extractHostname(this.endpoint);

    let canonicalRequest = buildCanonicalRequest(
      verb,
      path,
      queryParams,
      headers,
      body
    );
    let hashedCanonicalRequest = hashCanonicalRequest(canonicalRequest);
    let credentialScope = buildCredentialScope(
      datetime,
      this.region,
      this.serviceName
    );
    let stringToSign = buildStringToSign(
      datetime,
      credentialScope,
      hashedCanonicalRequest
    );
    let signingKey = calculateSigningKey(
      this.secretKey,
      datetime,
      this.region,
      this.serviceName
    );
    let signature = calculateSignature(signingKey, stringToSign);
    headers[AUTHORIZATION] = buildAuthorizationHeader(
      this.accessKey,
      credentialScope,
      headers,
      signature
    );
    if (this.sessionToken !== undefined && this.sessionToken !== "") {
      headers[X_AMZ_SECURITY_TOKEN] = this.sessionToken;
    }
    delete headers[HOST];

    let url = this.endpoint + path;
    let queryString = buildCanonicalQueryString(queryParams);
    if (queryString !== "") {
      url += "?" + queryString;
    }

    // Need to re-attach Content-Type if it is not specified at this point
    if (headers["Content-Type"] === undefined) {
      headers["Content-Type"] = this.defaultContentType;
    }

    return {
      headers: headers,
      url: url
    };
  }
}
