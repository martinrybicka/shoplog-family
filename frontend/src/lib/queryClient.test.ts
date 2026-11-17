import { describe, expect, it } from "vitest";
import { createQueryClient } from "./queryClient";
import { ApiError } from "./api";
describe("soukromá query cache", () => {
  it("po nové chybě oprávnění nezachová dříve načtená data", async () => {
    const client = createQueryClient();
    client.setQueryData(["purchase", "id"], { name: "Soukromý název" });
    await expect(
      client.fetchQuery({
        queryKey: ["purchase", "id"],
        queryFn: async () => {
          throw new ApiError(404, "not_found", "Není dostupné");
        },
      }),
    ).rejects.toThrow("Není dostupné");
    expect(client.getQueryData(["purchase", "id"])).toBeUndefined();
    client.clear();
  });
});
