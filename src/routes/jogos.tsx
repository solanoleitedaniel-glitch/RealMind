import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/jogos")({
  component: () => <Outlet />,
});
