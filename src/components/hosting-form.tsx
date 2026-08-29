"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { HOSTING_TYPE_OPTIONS } from "@/lib/constants";
import type { HostingService } from "@/lib/supabase/database.types";
import {
  createHostingAction,
  updateHostingAction,
  type ActionState,
} from "@/modules/clients/actions";

export function HostingForm({
  clientId,
  hosting,
}: {
  clientId: string;
  hosting?: HostingService;
}) {
  const action = hosting
    ? updateHostingAction.bind(null, clientId, hosting.id)
    : createHostingAction.bind(null, clientId);
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={hosting?.name}
          data-testid="hosting-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hosting_type">Hosting type</Label>
        <NativeSelect
          id="hosting_type"
          name="hosting_type"
          defaultValue={hosting?.hosting_type}
          data-testid="hosting-type"
        >
          {HOSTING_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project_url">Project URL</Label>
        <Input
          id="project_url"
          name="project_url"
          placeholder="https://"
          defaultValue={hosting?.project_url ?? ""}
          data-testid="project-url"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <NativeSelect
          id="status"
          name="status"
          defaultValue={hosting?.status ?? "ACTIVE"}
          data-testid="hosting-status"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea id="remarks" name="remarks" defaultValue={hosting?.remarks ?? ""} />
      </div>
      <SubmitButton data-testid="save-hosting">
        {hosting ? "Save changes" : "Add hosting"}
      </SubmitButton>
    </form>
  );
}
