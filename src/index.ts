class KiyvstarAdwisorError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

type AuthApiError = {
  error: "invalid_request" | string;
  error_verbose: string;
  error_description: string;
  error_hint: string;
  status_code: 400;
};

type BaseApiError = {
  reqId: string;
  errorCode: number;
  errorMsg: string;
};

type SendSMSResponse = {
  reqId: string;
  msgId: string;
  reservedSmsSegments: number;
};

type CheckSMSResponse = {
  reqId: string;
  msgId: string;
  status: "delivered" | string;
  date: string;
};

export default class KiyvstarAdwisor {
  private is_sandbox: boolean;
  private client_id: string;
  private client_secret: string;

  private access_token: string | null = null;
  private access_token_expiry: number | null = null;

  private readonly base_url: string = "https://api-gateway.kyivstar.ua/rest/v1";
  private readonly sandbox_url: string = "https://api-gateway.kyivstar.ua/sandbox/rest/v1";
  private readonly auth_url: string = "https://api-gateway.kyivstar.ua/idp/oauth2/token";

  constructor(client_id: string, client_secret: string, use_sandbox: boolean = false) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.is_sandbox = use_sandbox;
    if (typeof process !== "undefined" && process.versions?.node) {
      if (parseInt(process.versions.node) < 18) {
        throw new Error("KiyvstarAdwisor requires Node.js version 18 or higher.");
      }
    }
  }

  private get basic(): string {
    const credentials = `${this.client_id}:${this.client_secret}`;
    if (typeof Buffer !== "undefined") {
      return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
    }
    if (typeof TextEncoder !== "undefined") {
      const buffer = new TextEncoder().encode(credentials);
      return `Basic ${btoa(String.fromCharCode(...buffer))}`;
    }
    throw new Error("Buffer or TextEncoder is not available in this environment.");
  }

  private form(data: { [key: string]: any }, prefix?: string): string {
    const pairs = [];
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue;
      const value = data[key];
      const fullKey = prefix ? `${prefix}[${encodeURIComponent(key)}]` : encodeURIComponent(key);

      if (value === null || value === undefined) {
        continue; // пропускаємо null/undefined
      } else if (typeof value === "object" && !Array.isArray(value)) {
        pairs.push(this.form(value, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((val) => {
          pairs.push(`${fullKey}[]=${encodeURIComponent(val)}`);
        });
      } else {
        pairs.push(`${fullKey}=${encodeURIComponent(value)}`);
      }
    }
    return pairs.join("&");
  }

  private async auth() {
    try {
      const response = await fetch(this.auth_url, {
        method: "POST",
        headers: {
          Authorization: this.basic,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: this.form({ grant_type: "client_credentials" }),
      });
      if (!response.ok) {
        const { error_description, error_verbose, error_hint, status_code }: AuthApiError = await response.json();
        throw new KiyvstarAdwisorError(error_description ?? error_verbose ?? error_hint ?? "Unknown error", status_code);
      }
      const result = await response.json();
      this.access_token = result.access_token;
      this.access_token_expiry = Date.now() + result.expires_in * 1000;
    } catch (error: any) {
      if (error instanceof KiyvstarAdwisorError) throw error;
      throw new KiyvstarAdwisorError(error.cause?.name ?? "Authentication failed", 500);
    }
  }

  private async request<T = any>(method: "POST" | "GET", endpoint: string, body?: Record<string, any>): Promise<T> {
    if (this.access_token_expiry === null || Date.now() >= this.access_token_expiry) await this.auth();
    const response = await fetch(`${this.is_sandbox ? this.sandbox_url : this.base_url}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.access_token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const { errorMsg, errorCode }: BaseApiError = await response.json();
      throw new KiyvstarAdwisorError(errorMsg ?? "Unknown error", errorCode ?? response.status);
    }
    return await response.json();
  }

  sendSMS(from: string, to: string, text: string, maxSegments: number = 1, messageTtlSec: number = 86_400): Promise<SendSMSResponse> {
    return this.request<SendSMSResponse>("POST", "/sms", { from, to, text, maxSegments, messageTtlSec });
  }
  checkSMS(msgId: string): Promise<CheckSMSResponse> {
    return this.request<CheckSMSResponse>("GET", `/sms/${msgId}`);
  }
  sendViber(from: string, to: string, text: string, maxSegments: number = 1, messageTtlSec: number = 86_400): Promise<SendSMSResponse> {
    return this.request<SendSMSResponse>("POST", "/viber/transaction", { from, to, text, maxSegments, messageTtlSec });
  }
  checkViber(msgId: string): Promise<CheckSMSResponse> {
    return this.request<CheckSMSResponse>("GET", `/viber/status/${msgId}`);
  }
}
