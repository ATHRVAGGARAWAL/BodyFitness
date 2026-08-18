import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BodyFitness",
    short_name: "BodyFitness",
    description: "A private body recomposition and fitness tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090d",
    theme_color: "#09090d",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
