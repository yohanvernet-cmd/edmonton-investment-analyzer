const COGNITO_POOL_ID = 'us-east-1:6f04a317-953d-4b4f-bc3b-e064689bc327';
const REGION = 'us-east-1';
const LAMBDA_NAME = 'edmonton-bedrock-analyzer';

interface Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

let cached: Credentials | null = null;
let expiry = 0;

async function getCredentials(): Promise<Credentials> {
  if (cached && Date.now() < expiry) return cached;

  const cognitoUrl = `https://cognito-identity.${REGION}.amazonaws.com/`;

  const idResp = await fetch(cognitoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityService.GetId' },
    body: JSON.stringify({ IdentityPoolId: COGNITO_POOL_ID }),
  });
  const { IdentityId } = await idResp.json();

  const credResp = await fetch(cognitoUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityService.GetCredentialsForIdentity' },
    body: JSON.stringify({ IdentityId }),
  });
  const { Credentials } = await credResp.json();

  cached = { accessKeyId: Credentials.AccessKeyId, secretAccessKey: Credentials.SecretKey, sessionToken: Credentials.SessionToken };
  expiry = Date.now() + 50 * 60 * 1000;
  return cached;
}

export async function invokeLambda(content: string): Promise<any> {
  const creds = await getCredentials();

  // Use AWS SDK to invoke Lambda
  const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
  const lambda = new LambdaClient({
    region: REGION,
    credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken },
  });

  const command = new InvokeCommand({
    FunctionName: LAMBDA_NAME,
    Payload: new TextEncoder().encode(JSON.stringify({ body: JSON.stringify({ content }) })),
  });

  const response = await lambda.send(command);
  const payload = JSON.parse(new TextDecoder().decode(response.Payload));

  if (payload.statusCode !== 200) {
    const errBody = JSON.parse(payload.body || '{}');
    throw new Error(errBody.error || 'Lambda error');
  }

  return JSON.parse(payload.body);
}
