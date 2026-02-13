import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
 const navigate = useNavigate();
  navigate({to:"/drive/my-drive"})
}