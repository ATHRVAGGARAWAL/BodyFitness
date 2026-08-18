import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityRings } from "@/components/dashboard/activity-rings";

describe("ActivityRings", () => {
  it("renders all three tracked metrics", () => {
    render(
      <ActivityRings
        calories={1800}
        calorieTarget={2400}
        protein={110}
        proteinTarget={140}
        steps={7200}
        stepTarget={10000}
      />,
    );
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
