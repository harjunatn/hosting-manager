"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  createContactAction,
  type ActionState,
} from "@/modules/clients/actions";

export function ContactForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createContactAction.bind(null, clientId),
    null,
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required data-testid="contact-name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          data-testid="contact-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_primary" defaultChecked />
        Primary contact
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="receive_invoice" defaultChecked />
        Receives invoices
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="receive_reminder" defaultChecked />
        Receives reminders
      </label>
      <SubmitButton data-testid="save-contact">Add contact</SubmitButton>
    </form>
  );
}
