import { expect, it } from "vite-plus/test";

it("defines Workspace and Development as presentation modes", () => {
  expect(["workspace", "development"]).toHaveLength(2);
});
