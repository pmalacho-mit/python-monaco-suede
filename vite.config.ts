import { defineConfig } from "vitest/config";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { fileURLToPath } from "node:url";
import { applyConfig } from "./release/config/vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default applyConfig(
  defineConfig({
    plugins: [tailwindcss(), sveltekit()],

    server: { fs: { allow: [projectRoot] } },

    test: {
      expect: { requireAssertions: true },

      projects: [
        {
          extends: "./vite.config.ts",

          test: {
            name: "server",
            environment: "node",
            include: ["src/**/*.{test,spec}.{js,ts}"],
            exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          },
        },
      ],
    },
  }),
);
