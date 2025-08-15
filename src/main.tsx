import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

createRoot(document.getElementById("root")!).render(
  <MantineProvider
    forceColorScheme="light"
    theme={{ defaultRadius: "lg", fontFamily: "'Inter', sans-serif" }}
  >
    <App />
    <Notifications />
  </MantineProvider>
);
