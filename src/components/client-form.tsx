"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createClientAction,
  updateClientAction,
  type ActionState,
} from "@/modules/clients/actions";
import type { Client } from "@/lib/supabase/database.types";

export function ClientForm({ client }: { client?: Client }) {
  const action = client
    ? updateClientAction.bind(null, client.id)
    : createClientAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <Field label="Business name" htmlFor="business_name">
        <Input
          id="business_name"
          name="business_name"
          required
          defaultValue={client?.business_name}
          data-testid="business-name"
        />
      </Field>
      <Field label="Billing name" htmlFor="billing_name">
        <Input
          id="billing_name"
          name="billing_name"
          required
          defaultValue={client?.billing_name}
          data-testid="billing-name"
        />
      </Field>
      <Field label="Billing address" htmlFor="billing_address">
        <Textarea
          id="billing_address"
          name="billing_address"
          defaultValue={client?.billing_address ?? ""}
        />
      </Field>
      <Field label="Country" htmlFor="country">
        <Input id="country" name="country" defaultValue={client?.country ?? ""} />
      </Field>
      <Field label="Default currency" htmlFor="default_currency">
        <NativeSelect
          id="default_currency"
          name="default_currency"
          defaultValue={client?.default_currency ?? "SGD"}
        >
          <option value="SGD">SGD</option>
          <option value="THB">THB</option>
        </NativeSelect>
      </Field>
      <Field label="Status" htmlFor="status">
        <NativeSelect id="status" name="status" defaultValue={client?.status ?? "ACTIVE"}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </NativeSelect>
      </Field>
      <Field label="Remarks" htmlFor="remarks">
        <Textarea id="remarks" name="remarks" defaultValue={client?.remarks ?? ""} />
      </Field>
      <SubmitButton data-testid="save-client">
        {client ? "Save changes" : "Create client"}
      </SubmitButton>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
