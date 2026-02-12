import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/drive/__drive/shared/$token/file/$fileId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/shared/$token/file/fileId"!</div>
}
