import React from "react";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

/**
 * The shell is deliberately bare: the player owns its CRT overlays and the studio
 * owns its chrome, so neither inherits the other's furniture.
 */
export const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div id="title-screen" className="screen active">
      <div className="title-logo">{title}</div>
      <div className="title-divider"></div>
      <div className="title-instructions">{children}</div>
      <Link to="/" className="btn-primary" style={{ textDecoration: "none" }}>
        BACK TO MISSION SELECT
      </Link>
    </div>
  );
}

function NotFound() {
  return <Shell title="404">That route does not exist.</Shell>;
}

function RouteError({ error }: { error: Error }) {
  return <Shell title="ERROR">{error.message}</Shell>;
}
