import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/realidade")({
  component: () => <Outlet />,
});
