import type { ProFormaData } from '@/types';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.APP_REGION || 'us-east-1';
const BEDROCK_ROLE_ARN = process.env.BEDROCK_ROLE_ARN || '';
const MODEL_ID = 'us.anthropic.claude-sonnet-4-20250514-v1:0';

const COMBINED_PROMPT = `Tu es un expert en analyse d'investissement immobilier a Edmonton, Alberta.
On te donne le contenu brut d'un pro forma immobilier. Tu dois faire 3 choses en UNE SEULE reponse JSON:
1. EXTRAIRE les donnees du pro forma
2. ANALYSER le quartier base sur l'adresse
3. GENERER un resume executif
Reponds UNIQUEMENT avec du JSON valide avec les cles: proForma, neighborhood, summary.`;

async function getBedrockClient(): Promise<BedrockRuntimeClient> {
  if (!BEDROCK_ROLE_ARN) {
    return new BedrockRuntimeClient({ region: REGION });
  }
  const sts = new STSClient({ region: REGION });
  const assumed = await sts.send(new AssumeRoleCommand({
    RoleArn: BEDROCK_ROLE_ARN,
    RoleSessionName: 'amplify-bedrock',
    DurationSeconds: 900,
  }));
  const creds = assumed.Credentials!;
  return new BedrockRuntimeClient({
    region: REGION,
    credentials: {
      accessKeyId: creds.AccessKeyId!,
      secretAccessKey: creds.SecretAccessKey!,
      sessionToken: creds.SessionToken!,
    },
  });
}

export async function analyzeWithAI(content: string): Promise<{ proForma: any; neighborhood: any; summary: any }> {
  const bedrock = await getBedrockClient();
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [{ role: 'user', content: COMBINED_PROMPT + '\n\nVoici le contenu du pro forma:\n\n' + content }]
    })
  });
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content?.[0]?.text || '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  return { proForma: parsed.proForma || {}, neighborhood: parsed.neighborhood || {}, summary: parsed.summary || {} };
}
