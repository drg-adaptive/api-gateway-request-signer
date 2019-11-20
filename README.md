# API Gateway Request Signer

[![Build Status](https://travis-ci.org/drg-adaptive/api-gateway-request-signer.svg)](https://travis-ci.org/drg-adaptive/api-gateway-request-signer)
[![Maintainability](https://api.codeclimate.com/v1/badges/006339522a8624e9bacb/maintainability)](https://codeclimate.com/github/drg-adaptive/api-gateway-request-signer/maintainability)
[![npm version](https://badge.fury.io/js/api-gateway-request-signer.svg)](https://badge.fury.io/js/api-gateway-request-signer)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fapi-gateway-request-signer.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fapi-gateway-request-signer?ref=badge_shield)

Sign requests to IAM authorized API Gateway APIs

## Usage

First, create an instance of the client

```typescript
import ApiGatewaySigner from "api-gateway-request-signer";

const apiSigner = new ApiGatewaySigner({
  endpoint: "https://API_GATEWAY_ID.execute-api.REGION.amazonaws.com/STAGE",
  region: "us-east-1"
});
```

Now, when you want to make a call to the api, create a signed request

```typescript
const request = apiSigner.signRequest({
  method: HttpMethods.GET,
  path: `/path/to/some/resource`
});
```

Finally you're ready to actually make the request.

```typescript
const result = await axios.get(request.url, { headers: request.headers });
```

### Credendtials

To sign your request the library requires a set of credentials. You can provide
these credentials as part of the initial config, or in environment variables.

#### Configuration

You can specify the credentials to sign requests with by passing them into the
constructor using the `accessKey`, `secretKey`, and `sessionToken` config
parameters.

```typescript
const apiSigner = new ApiGatewaySigner({
  endpoint: "https://API_GATEWAY_ID.execute-api.REGION.amazonaws.com/STAGE",
  region: "us-east-1",

  accessKey: "SOME_KEY",
  secretKey: "SECRET",
  sessionToken: "SESSION_TOKEN"
});
```

#### Environment Variables

If values aren't provided in the constructor, the values of the `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, and `AWS_SESSION_TOKEN` environment variables will be
used. These values will be populated by default in a lambda runtime envrionment.

See [Lambda Environment Variables](https://docs.aws.amazon.com/lambda/latest/dg/lambda-environment-variables.html) for more information.

## License

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fapi-gateway-request-signer.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fdrg-adaptive%2Fapi-gateway-request-signer?ref=badge_large)
