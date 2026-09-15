import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/workout" }));

import { AppNav, isActivePath } from "@/components/app-nav";

describe("AppNav", () => {
  it("renders five destinations with exactly one marked current", () => {
    render(<AppNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/workout", "/nutrition", "/progress", "/profile"]);
    expect(links.filter((link) => link.getAttribute("aria-current") === "page")).toHaveLength(1);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
  });

  it("only treats the root as active on the exact root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/profile", "/")).toBe(false);
    expect(isActivePath("/profile/circle", "/profile")).toBe(true);
  });
});
