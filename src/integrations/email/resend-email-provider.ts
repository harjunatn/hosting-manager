import { Resend, type WebhookEventPayload } from "resend";

type Environment = Record<string, string | undefined>;

export type ResendEmailConfig = {
  apiKey: string;
  from: string;
  deliveryMode: "test" | "live";
  testRecipient?: string;
  webhookSecret?: string;
};

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  recipient: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  idempotencyKey: string;
  tags?: { name: string; value: string }[];
};

function requiredEnv(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required when Resend is enabled.`);
  }
  return value;
}

export function getResendEmailConfig(
  env: Environment = process.env,
): ResendEmailConfig | null {
  if (env.RESEND_ENABLED !== "true") {
    return null;
  }

  const deliveryMode =
    env.EMAIL_DELIVERY_MODE === "live" ? ("live" as const) : ("test" as const);
  const testRecipient =
    deliveryMode === "test"
      ? requiredEnv(env, "EMAIL_TEST_RECIPIENT")
      : undefined;

  return {
    apiKey: requiredEnv(env, "RESEND_API_KEY"),
    from: requiredEnv(env, "RESEND_FROM_EMAIL"),
    deliveryMode,
    testRecipient,
    webhookSecret: env.RESEND_WEBHOOK_SECRET?.trim() || undefined,
  };
}

export class ResendEmailProvider {
  private readonly resend: Resend;

  constructor(private readonly config: ResendEmailConfig) {
    this.resend = new Resend(config.apiKey);
  }

  async send(input: SendEmailInput) {
    const deliveryEmail =
      this.config.deliveryMode === "test"
        ? this.config.testRecipient!
        : input.recipient;
    const subject =
      this.config.deliveryMode === "test"
        ? `[TEST for ${input.recipient}] ${input.subject}`
        : input.subject;
    const { data, error } = await this.resend.emails.send(
      {
        from: this.config.from,
        to: deliveryEmail,
        subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments,
        tags: input.tags,
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (error || !data) {
      throw new Error(`Resend: ${error?.message ?? "Email could not be sent."}`);
    }

    return {
      providerMessageId: data.id,
      deliveryEmail,
      subject,
    };
  }

  verifyWebhook(input: {
    payload: string;
    id: string;
    timestamp: string;
    signature: string;
  }): WebhookEventPayload {
    if (!this.config.webhookSecret) {
      throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
    }
    return this.resend.webhooks.verify({
      payload: input.payload,
      headers: {
        id: input.id,
        timestamp: input.timestamp,
        signature: input.signature,
      },
      webhookSecret: this.config.webhookSecret,
    });
  }
}

let provider: ResendEmailProvider | null = null;

export function getResendEmailProvider() {
  const config = getResendEmailConfig();
  if (!config) {
    return null;
  }
  provider ??= new ResendEmailProvider(config);
  return provider;
}
