import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/drive/__drive/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate();
  navigate({to:"/drive/my-drive"})
}
