import { createLazyRoute } from "@tanstack/react-router";
import { EditorLayout } from "../EditorLayout.tsx";

export const Route = createLazyRoute("/editor")({ component: EditorLayout });
