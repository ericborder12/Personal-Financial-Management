import { request } from "./client";

export const aiApi = {
  askQA: (messages) =>
    request("/finance/ai/qa/", {
      method: "POST",
      body: { messages },
    }),
};
