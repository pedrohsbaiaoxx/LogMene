declare module '@sendinblue/client' {
  export class ApiClient {
    static instance: {
      authentications: {
        'api-key': { apiKey: string };
      };
    };
  }

  export class TransactionalEmailsApi {
    constructor();
    sendTransacEmail(data: {
      to: Array<{ email: string }>;
      sender: { email: string };
      subject: string;
      htmlContent?: string;
      textContent?: string;
    }): Promise<any>;
  }
}