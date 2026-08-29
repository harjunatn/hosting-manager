"use client";

import { useActionState, useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { HostingService } from "@/lib/supabase/database.types";
import {
  createSubscriptionAction,
  type ActionState,
} from "@/modules/clients/actions";
import { yearlyExpiryFromStart } from "@/modules/subscriptions/status";

export function SubscriptionForm({
  clientId,
  hosting,
  defaultCurrency,
}: {
  clientId: string;
  hosting: HostingService[];
  defaultCurrency: "SGD" | "THB";
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createSubscriptionAction.bind(null, clientId),
    null,
  );
  const [startDate, setStartDate] = useState("");
  const expiry = useMemo(
    () => (startDate ? yearlyExpiryFromStart(startDate) : null),
    [startDate],
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="hosting_service_id">Hosting service</Label>
        <NativeSelect
          id="hosting_service_id"
          name="hosting_service_id"
          required
          data-testid="subscription-hosting"
        >
          {hosting.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          defaultValue={1}
          required
          data-testid="subscription-quantity"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="unit_price">Unit price</Label>
        <Input
          id="unit_price"
          name="unit_price"
          required
          defaultValue="250.00"
          data-testid="subscription-price"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="currency">Currency</Label>
        <NativeSelect id="currency" name="currency" defaultValue={defaultCurrency}>
          <option value="SGD">SGD</option>
          <option value="THB">THB</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="start_date">Start date</Label>
        <Input
          id="start_date"
          name="start_date"
          type="date"
          required
          data-testid="subscription-start"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          First billing period starts on this date. Expiry is set automatically to
          one year later.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="expiry_preview">Expiry date</Label>
        <Input
          id="expiry_preview"
          type="date"
          readOnly
          tabIndex={-1}
          value={expiry ?? ""}
          className="bg-muted/50"
        />
      </div>
      <SubmitButton data-testid="save-subscription">Create subscription</SubmitButton>
    </form>
  );
}
