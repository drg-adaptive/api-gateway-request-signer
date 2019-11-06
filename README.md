# api-gateway-request-signer
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
  path: `/path/to/some/resource`,
});
```

Finally you're ready to actually make the request.

```typescript
const result = await axios.get(request.url, {headers: request.headers});
```
