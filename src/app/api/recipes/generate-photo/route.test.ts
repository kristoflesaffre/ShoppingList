import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  owner: "owner",
  admin: { query: vi.fn(), transact: vi.fn(), tx: { foodImages: {} } as any },
  references: vi.fn(),
}));
vi.mock("@/lib/server/instant-admin", () => ({
  getInstantAdminDb: () => mocks.admin,
}));
vi.mock("@/lib/server/google-connection-store", () => ({
  verifiedUserId: async () => mocks.owner,
}));
vi.mock("@/lib/image-generation/referenceImages", () => ({
  loadReferenceImages: mocks.references,
}));
import sharp from "sharp";
import { POST } from "./route";
const recipeId = "11111111-1111-4111-a111-111111111111",
  requestId = "22222222-2222-4222-a222-222222222222";
const req = () =>
  new Request("http://localhost/api/recipes/generate-photo", {
    method: "POST",
    body: JSON.stringify({ recipeId, requestId }),
  });
describe("manual recipe photo authorization and billing guards", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.GEMINI_API_KEY = "test-only";
    mocks.owner = "owner";
    mocks.admin.query.mockResolvedValue({ foodImages: [], recipes: [] });
  });
  it("rejects unsigned requests before reading recipes or calling Gemini", async () => {
    mocks.owner = "";
    expect((await POST(req())).status).toBe(401);
    expect(mocks.admin.query).not.toHaveBeenCalled();
  });
  it("rejects another owner's recipe", async () => {
    mocks.admin.query
      .mockResolvedValueOnce({ foodImages: [] })
      .mockResolvedValueOnce({ recipes: [{ ownerId: "someone-else" }] });
    expect((await POST(req())).status).toBe(404);
    expect(mocks.references).not.toHaveBeenCalled();
  });
  it("rejects recipes outside Nog te testen", async () => {
    mocks.admin.query
      .mockResolvedValueOnce({ foodImages: [] })
      .mockResolvedValueOnce({
        recipes: [{ ownerId: "owner", category: "hoofdgerecht" }],
      });
    expect((await POST(req())).status).toBe(409);
    expect(mocks.references).not.toHaveBeenCalled();
  });
  it("returns an already completed request without a second paid call", async () => {
    mocks.admin.query.mockResolvedValue({
      foodImages: [
        {
          ownerId: "owner",
          dishDescription: JSON.stringify({ state: "completed" }),
          imageUrl: "data:image/webp;base64,AAAA",
          estimatedCost: 0.055,
        },
      ],
    });
    const response = await POST(req());
    expect(response.status).toBe(200);
    expect((await response.json()).replayed).toBe(true);
    expect(mocks.references).not.toHaveBeenCalled();
  });
  it("does not retry a pending paid request", async () => {
    mocks.admin.query.mockResolvedValue({
      foodImages: [
        {
          ownerId: "owner",
          dishDescription: JSON.stringify({ state: "pending" }),
        },
      ],
    });
    expect((await POST(req())).status).toBe(409);
    expect(mocks.references).not.toHaveBeenCalled();
  });
  it("blocks concurrent callers at the atomic recipe lock before generation", async () => {
    mocks.admin.query
      .mockResolvedValueOnce({ foodImages: [] })
      .mockResolvedValueOnce({
        recipes: [
          { ownerId: "owner", category: "nog_te_testen", name: "Chicken" },
        ],
      });
    mocks.references.mockResolvedValue([1, 2, 3, 4]);
    mocks.admin.tx.foodImages = new Proxy(
      {},
      { get: () => ({ create: () => "strict-create" }) },
    );
    mocks.admin.transact.mockRejectedValueOnce(Error("already exists"));
    expect((await POST(req())).status).toBe(409);
    expect(mocks.admin.transact).toHaveBeenCalledTimes(1);
  });
  it("runs one paid call, stores its measured cost and applies only the finished transparent photo", async () => {
    const source = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="1024" height="1024"><circle cx="512" cy="512" r="440" fill="#a85224"/></svg>',
          ),
        },
      ])
      .png()
      .toBuffer();
    const recipe = {
      id: recipeId,
      ownerId: "owner",
      category: "nog_te_testen",
      name: "Chicken",
      link: "https://www.tiktok.com/@cook/video/123",
      photoUrl: `data:image/png;base64,${source.toString("base64")}`,
      steps: "Bake chicken",
      ingredients: [{ name: "Chicken", quantity: "200 g", order: 1 }],
    };
    mocks.admin.query
      .mockResolvedValueOnce({ foodImages: [] })
      .mockResolvedValueOnce({ recipes: [recipe] })
      .mockResolvedValueOnce({ foodImages: [] })
      .mockResolvedValueOnce({ recipes: [recipe] });
    mocks.references.mockResolvedValue(
      Array.from({ length: 4 }, () => ({ bytes: source })),
    );
    const tx = new Proxy(
      {},
      {
        get: (_, entity) =>
          new Proxy(
            {},
            {
              get: (_, id) => ({
                create: (data: unknown) => ({
                  entity,
                  id,
                  action: "create",
                  data,
                }),
                update: (data: unknown) => ({
                  entity,
                  id,
                  action: "update",
                  data,
                }),
                delete: () => ({ entity, id, action: "delete" }),
              }),
            },
          ),
      },
    );
    mocks.admin.tx = tx as any;
    mocks.admin.transact.mockResolvedValue({});
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            usageMetadata: {
              promptTokenCount: 6045,
              candidatesTokenCount: 1579,
              thoughtsTokenCount: 1208,
              candidatesTokensDetails: [
                { modality: "IMAGE", tokenCount: 1120 },
              ],
            },
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: source.toString("base64"),
                      },
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const response = await POST(req());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.estimatedCost).toBeCloseTo(0.05517, 8);
    expect(data.imageUrl).toMatch(/^data:image\/webp;base64,/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const commits = mocks.admin.transact.mock.calls.map((c) => c[0]);
    expect(commits.flat().filter((c) => c.entity === "recipes")).toEqual([
      expect.objectContaining({
        id: recipeId,
        data: { photoUrl: data.imageUrl },
      }),
    ]);
    expect(
      commits
        .flat()
        .some(
          (c) =>
            c.data?.provider === "recipe-photo-original" &&
            c.data.imageUrl === recipe.photoUrl,
        ),
    ).toBe(true);
    expect(
      commits.flat().some((c) => c.data?.estimatedCost === data.estimatedCost),
    ).toBe(true);
    expect(commits.at(-1)).toMatchObject({
      entity: "foodImages",
      action: "delete",
    });
  });
});
