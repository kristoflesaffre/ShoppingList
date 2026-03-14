import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "var(--bg-default, #f1f1f3)" },
        { name: "white", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
