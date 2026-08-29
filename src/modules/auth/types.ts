export type UserRole = "ADMIN" | "CLIENT";

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  clientId: string | null;
};
