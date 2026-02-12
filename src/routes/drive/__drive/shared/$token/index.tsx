import { createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { IconLoader2, IconShareOff } from '@tabler/icons-react'

import FileCard from '@/components/shared/grid-layout/file-card'
import FolderCard from '@/components/shared/grid-layout/folder-card'
import { Button } from '@/components/ui/button'
import { FolderErrorComponent } from '@/components/drive/grid-layout/folder-error'

export const Route = createFileRoute('/drive/__drive/shared/$token/')({
  component: RouteComponent,
  errorComponent: FolderErrorComponent,
})

function RouteComponent() {
  const { token } = Route.useParams()
  

  // 2. Fetch paginated shared items
  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.getSharedItems,
    {
      token,
      folderId: undefined,
    },
    { initialNumItems: 20 },
  )

  // 4. Loading State
  if (status === 'LoadingFirstPage') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4">
        <IconLoader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm font-medium text-muted-foreground">
          Accessing shared items...
        </p>
      </div>
    )
  }

  // 5. Error / Empty State (Link expired or invalid)
  if (results.length === 0 && status === 'Exhausted') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="p-4 bg-muted rounded-full">
          <IconShareOff size={48} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">Share link unavailable</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This link may have expired, been deleted, or you don't have permission
          to view it.
        </p>
      </div>
    )
  }

  return (
    <div className="container p-4 min-h-screen">
      {/* Header / Breadcrumb UI */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-lg font-bold p-0 hover:bg-transparent"
          >
            Shared Files
          </Button>
        </div>
      </header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((item) =>
          item.type === 'folder' ? (
            <div key={item._id}>
              <FolderCard
                id={item._id}
                name={item.name}
                color={item.color}
                isPublic={true}
                isStarted={item.isStarred}
                isTrashed={item.isDeleted}
                token={token}
              />
            </div>
          ) : (
            <FileCard
              key={item._id}
              id={item._id}
              name={item.name}
              mimeType={item.mimeType || ''}
              size={item.size || 0}
              thumbnailUrl={item.thumbnailUrl || ''}
              isPublic={true}
              isStarted={item.isStarred}
              isTrashed={item.isDeleted}
              token={token}
            />
          ),
        )}
      </div>

      {/* Infinite Load More */}
      {status === 'CanLoadMore' && (
        <div className="mt-10 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>
            Load More Items
          </Button>
        </div>
      )}

      {status === 'LoadingMore' && (
        <div className="mt-10 flex justify-center">
          <IconLoader2 className="animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
