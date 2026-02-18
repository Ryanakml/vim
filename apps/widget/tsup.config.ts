import { defineConfig } from "tsup";

export default defineConfig({
  format: ["iife"],
  entry: ["src/embed.ts"],
  outDir: "public",
  minify: true,
  clean: true,
  define: {
    "globalThis.__WIDGET_URL__": JSON.stringify(
      "https://widget.chattiphy.nextstackhq.app/",
    ),
  },
});
