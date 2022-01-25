import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export class GoogleSecretsConfigService extends Promise<Record<string, any>> {
  static async readGoogleSecrets(): Promise<Record<string, any>> {
    // Access the secret.
    const [accessResponse] = await client.accessSecretVersion({
      name: process.env.GOOGLE_SECRET_RESOURCE_ID
    });

    if (!accessResponse.payload?.data) {
      throw new Error('no payload.data in Google Secrets Response');
    }

    const secretObject: Record<string, any> = JSON.parse(accessResponse.payload.data.toString());
    return secretObject;
  }
}
