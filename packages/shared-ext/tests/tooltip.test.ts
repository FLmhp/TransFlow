// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { showTooltip, hideTooltip, bindTooltipDismissal } from "../src/content/tooltip.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  hideTooltip();
});

describe("tooltip", () => {
  it("inserts a tooltip element with the given text", () => {
    showTooltip("你好");
    const el = document.querySelector(".transflow-tooltip");
    expect(el).not.toBeNull();
    expect(el!.textContent).toContain("你好");
    expect(el!.querySelector(".transflow-tooltip-label")?.textContent).toContain("TransFlow");
  });

  it("renders an error label when `isError` is true", () => {
    showTooltip("boom", true);
    const label = document.querySelector(".transflow-tooltip-label");
    expect(label?.textContent).toContain("错误");
  });

  it("replaces an existing tooltip on consecutive calls", () => {
    showTooltip("first");
    showTooltip("second");
    const nodes = document.querySelectorAll(".transflow-tooltip");
    expect(nodes.length).toBe(1);
    expect(nodes[0]?.textContent).toContain("second");
  });

  it("hideTooltip removes the element", () => {
    showTooltip("hi");
    hideTooltip();
    expect(document.querySelector(".transflow-tooltip")).toBeNull();
  });

  it("bindTooltipDismissal closes the tooltip on document click", () => {
    bindTooltipDismissal();
    showTooltip("hi");
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(document.querySelector(".transflow-tooltip")).toBeNull();
  });
});
