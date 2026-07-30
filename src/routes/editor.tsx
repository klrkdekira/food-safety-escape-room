import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "./root.tsx";

/**
 * The whole studio subtree is lazily imported. Zod, Immer, and the editor forms
 * are a large slice of the bundle that a player has no use for, so nothing here
 * may be imported statically from this module.
 */
export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "editor",
}).lazy(() => import("../editor/routes/layout.tsx").then((d) => d.Route));

export const editorIndexRoute = createRoute({
  getParentRoute: () => editorRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/editor/config" });
  },
});

export const editorConfigRoute = createRoute({
  getParentRoute: () => editorRoute,
  path: "config",
}).lazy(() => import("../editor/routes/config.tsx").then((d) => d.Route));

export const editorRoomsRoute = createRoute({
  getParentRoute: () => editorRoute,
  path: "rooms",
}).lazy(() => import("../editor/routes/rooms.tsx").then((d) => d.Route));

export const editorPuzzlesRoute = createRoute({
  getParentRoute: () => editorRoute,
  path: "puzzles",
}).lazy(() => import("../editor/routes/puzzles.tsx").then((d) => d.Route));

/**
 * The studio used to live at /author. Catch that prefix and forward it so old
 * bookmarks keep working.
 *
 * Note this only takes effect once the stale `docs/author/index.html` is out of
 * the published directory: a real file on disk always beats a client-side route,
 * so while that file is deployed it is served instead of the app.
 */
export const legacyAuthorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "author",
  beforeLoad: () => {
    throw redirect({ to: "/editor/config" });
  },
});

/** Lets /author/rooms and friends match at all, so the parent can redirect them. */
export const legacyAuthorSplatRoute = createRoute({
  getParentRoute: () => legacyAuthorRoute,
  path: "$",
});
