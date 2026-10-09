import { createServerFn } from "@tanstack/react-start";

export const getSignInOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { brokerSignInAllowed } = await import("./sign-in-options.server");
  return { broker: brokerSignInAllowed() };
});
