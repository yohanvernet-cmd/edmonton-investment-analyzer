const COGNITO_POOL_ID = 'us-east-1:6f04a317-953d-4b4f-bc3b-e064689bc327';
const REGION = 'us-east-1';
const API_URL = 'https://umg0ern27a.execute-api.us-east-1.amazonaws.com/prod/analyze';

interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

let cachedCredentials: AWSCredentials | null = null;
let credentialsExpiry = 0;

export async function getCognitoCredentials(): Promise<AWSCredentials> {
  if (cachedCredentials && Date.now() < credentialsExpiry) {
    return cachedCredentials;
  }

  // Step 1: Get identity ID
  const idResp = await fetch(`https://cognito-identity.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityService.GetId',
    },
    body: JSON.stringify({ IdentityPoolId: COGNITO_POOL_ID }),
  });
  const { IdentityId } = await idResp.json();

  // Step 2: Get credentials
  const credResp = await fetch(`https://cognito-identity.${REGION}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityService.GetCredentialsForIdentity',
    },
    body: JSON.stringify({ IdentityId }),
  });
  const { Credentials } = await credResp.json();

  cachedCredentials = {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretKey,
    sessionToken: Credentials.SessionToken,
  };
  // Cache for 50 minutes (credentials last 60 min)
  credentialsExpiry = Date.now() + 50 * 60 * 1000;

  return cachedCredentials;
}

// Minimal SigV4 signing
async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  let kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer as ArrayBuffer, dateStamp);
  let kRegion = await hmacSha256(kDate, region);
  let kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

export async function signedFetch(body: string): Promise<Response> {
  const creds = await getCognitoCredentials();
  const url = new URL(API_URL);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\..*/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const service = 'execute-api';

  const payloadHash = await sha256(body);
  const canonicalHeaders = `content-type:application/json\nhost:${url.host}\nx-amz-date:${amzDate}\nx-amz-security-token:${creds.sessionToken}\n`;
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-security-token';
  const canonicalRequest = `POST\n${url.pathname}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${REGION}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  const signingKey = await getSignatureKey(creds.secretAccessKey, dateStamp, REGION, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const authHeader = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      'X-Amz-Security-Token': creds.sessionToken,
      'Authorization': authHeader,
    },
    body,
  });
}
