import { Link, useRouter } from '@tanstack/react-router'
import { IconAlertTriangle, IconArrowLeft, IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function FolderErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  const router = useRouter()
  
  // Extract custom data from ConvexError if it exists
  const errorMessage = error?.data?.message || "An unexpected error occurred"
  const errorCode = error?.data?.code || 500

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 rounded-full bg-destructive/10 p-4 text-destructive">
        <IconAlertTriangle size={48} />
      </div>
      
      <h1 className="mb-2 text-2xl font-bold">
        {errorCode === 404 ? "Folder Not Found" : "Access Denied"}
      </h1>
      
      <p className="mb-8 max-w-md text-muted-foreground">
        {errorMessage}
      </p>

      <div className="flex flex-wrap gap-4">
        <Button variant="outline" onClick={() => router.history.back()}>
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        
        <Button onClick={() => reset()}>
          <IconRefresh className="mr-2 h-4 w-4" />
          Try Again
        </Button>

        <Button asChild variant="ghost">
          <Link to="/drive/my-drive">Return to My Drive</Link>
        </Button>
      </div>
    </div>
  )
}