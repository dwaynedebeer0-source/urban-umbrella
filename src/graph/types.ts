export interface GraphEmailAddress {
  name?: string;
  address: string;
}

export interface GraphEmailBody {
  contentType: "text" | "html";
  content: string;
}

export interface GraphEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: GraphEmailBody;
  from: { emailAddress: GraphEmailAddress };
  toRecipients: Array<{ emailAddress: GraphEmailAddress }>;
  ccRecipients: Array<{ emailAddress: GraphEmailAddress }>;
  receivedDateTime: string;
  isRead: boolean;
  conversationId: string;
  internetMessageId: string;
}

export interface GraphEmailList {
  value: GraphEmail[];
  "@odata.nextLink"?: string;
}

export interface SendMailPayload {
  message: {
    subject: string;
    body: { contentType: "Text" | "HTML"; content: string };
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
  };
  saveToSentItems: boolean;
}
