import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate();
  navigate({to:"/drive/my-drive"})
}
