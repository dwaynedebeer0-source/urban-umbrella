import {
  ConfidentialClientApplication,
  type AuthenticationResult,
} from "@azure/msal-node";
import { config } from "../config.js";

const msalApp = new ConfidentialClientApplication({
  auth: {
    clientId: config.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`,
    clientSecret: config.AZURE_CLIENT_SECRET,
  },
});

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

export async function getGraphToken(): Promise<string> {
  const result: AuthenticationResult | null =
    await msalApp.acquireTokenByClientCredential({
      scopes: [GRAPH_SCOPE],
    });

  if (!result?.accessToken) {
    throw new Error("Failed to acquire Microsoft Graph access token");
  }

  return result.accessToken;
}
