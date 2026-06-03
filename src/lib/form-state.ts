/** Shared result type for form server actions + their client components. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
};
