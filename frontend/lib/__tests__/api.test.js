import { triggerStkPush, checkPaymentStatus } from "../api";

describe("triggerStkPush", () => {
  test("returns pending status", async () => {
    const result = await triggerStkPush("0712345678", 1);
    expect(result.status).toBe("pending");
  });

  test("returns a transaction_id", async () => {
    const result = await triggerStkPush("0712345678", 1);
    expect(result.transaction_id).toBeDefined();
    expect(result.transaction_id).toContain("mock-");
  });

  test("transaction_id is unique per call", async () => {
    const result1 = await triggerStkPush("0712345678", 1);
    const result2 = await triggerStkPush("0712345678", 1);
    expect(result1.transaction_id).not.toBe(result2.transaction_id);
  });
});

describe("checkPaymentStatus", () => {
  test("returns pending for a fresh transaction", async () => {
    const id = "mock-" + Date.now();
    const result = await checkPaymentStatus(id);
    expect(result.status).toBe("pending");
  });

  test("returns success after 9 seconds have elapsed", async () => {
    const id = "mock-" + (Date.now() - 10000);
    const result = await checkPaymentStatus(id);
    expect(result.status).toBe("success");
  });

  test("returns pending just before 9 seconds", async () => {
    const id = "mock-" + (Date.now() - 8000);
    const result = await checkPaymentStatus(id);
    expect(result.status).toBe("pending");
  });

  test("returns error for invalid transaction id", async () => {
    const result = await checkPaymentStatus("bad-id");
    expect(result.status).toBe("error");
  });
});