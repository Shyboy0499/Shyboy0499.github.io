import { describe, expect, it, vi } from "vitest";
import { RuntimeResourceScope } from "../../src/runtime/resource-scope";

describe("RuntimeResourceScope", () => {
  it("unwinds registrations in reverse order and only once", () => {
    const order: string[] = [];
    const scope = new RuntimeResourceScope();
    scope.defer(() => order.push("first"));
    scope.defer(() => order.push("second"));
    expect(scope.pendingCleanupCount).toBe(2);
    expect(scope.isDisposed).toBe(false);

    scope.dispose();
    scope.dispose();

    expect(order).toEqual(["second", "first"]);
    expect(scope.pendingCleanupCount).toBe(0);
    expect(scope.isDisposed).toBe(true);
  });

  it("cleans up late registrations immediately after disposal", () => {
    const cleanup = vi.fn();
    const scope = new RuntimeResourceScope();
    scope.dispose();

    scope.defer(cleanup);

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("continues cleanup when one disposer throws", () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const cleanup = vi.fn();
    const scope = new RuntimeResourceScope();
    scope.defer(cleanup);
    scope.defer(() => {
      throw new Error("cleanup failed");
    });

    scope.dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
  });

  it("does not repeat an earlier cleanup disposed by a later cleanup", () => {
    const cleanup = vi.fn();
    const scope = new RuntimeResourceScope();
    const earlier = scope.defer(cleanup);
    scope.defer(() => earlier.dispose());

    scope.dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(scope.pendingCleanupCount).toBe(0);
  });
});
