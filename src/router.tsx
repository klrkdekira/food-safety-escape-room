import { createRouter } from "@tanstack/react-router";
import {
  editorConfigRoute,
  editorIndexRoute,
  editorPuzzlesRoute,
  editorRoomsRoute,
  editorRoute,
  legacyAuthorRoute,
  legacyAuthorSplatRoute,
} from "./routes/editor.tsx";
import { homeRoute } from "./routes/home.tsx";
import { playRoute } from "./routes/play.tsx";
import { previewRoute } from "./routes/preview.tsx";
import { rootRoute } from "./routes/root.tsx";

const routeTree = rootRoute.addChildren([
  homeRoute,
  playRoute,
  previewRoute,
  editorRoute.addChildren([
    editorIndexRoute,
    editorConfigRoute,
    editorRoomsRoute,
    editorPuzzlesRoute,
  ]),
  legacyAuthorRoute.addChildren([legacyAuthorSplatRoute]),
]);

export const router = createRouter({ routeTree });

// Registering the instance is what gives Link/useNavigate typed paths and params.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
