import FileCard from '@/components/drive/grid-layout/file-card'
import FolderCard from '@/components/drive/grid-layout/folder-card'
import { FolderSkeleton } from '@/components/drive/grid-layout/folder-skeleton'
import { IconStarFilled } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'
import { useEffect, useRef } from 'react'

export const Route = createFileRoute('/drive/__drive/stars')({
  component: RouteComponent,
})

function RouteComponent() {
  // 1. Fetch Starred Items
  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.startedList,
    {},
    { initialNumItems: 24 },
  )

  // 2. Infinite Scroll Logic
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === 'CanLoadMore') {
          loadMore(15)
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [status, loadMore])

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-2 px-2">
        <h1 className="text-xl font-bold">Starred Items</h1>
      </header>

      {/* Empty State: Shows when no items are starred */}
      {results.length === 0 && status !== 'LoadingFirstPage' && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-20 text-center bg-muted/5">
          <div className="rounded-full bg-yellow-500/10 p-4 mb-4">
            <IconStarFilled size={40} className="text-yellow-500/50" />
          </div>
          <p className="text-muted-foreground font-medium">No starred items</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-62.5">
            Mark important folders or files as starred to find them easily here
            later.
          </p>
        </div>
      )}

      {/* The Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {/* Initial Loading Skeletons */}
        {status === 'LoadingFirstPage' && (
          <>
            {Array.from({ length: 12 }).map((_, i) => (
              <FolderSkeleton key={`star-skeleton-${i}`} />
            ))}
          </>
        )}

        {/* Render Starred Files & Folders */}
        {results.map((item) => {
          if (item.type === 'folder') {
            return (
              <FolderCard
                key={item._id}
                id={item._id}
                color={item.color}
                name={item.name}
                isPublic={item.isPublic}
                isStarted={item.isStarred}
                isTrashed={item.isDeleted}
              />
            )
          }
          return (
            <FileCard
              key={item._id}
                id={item._id}
                name={item.name}
                mimeType={item.mimeType || ''}
                size={item.size || 0}
                isPublic={item.isPublic}
                isStarted={item.isStarred}
                thumbnailUrl={item.thumbnailUrl || ''}
                isTrashed={item.isDeleted}
            />
          )
        })}
      </div>

      {/* Infinite Scroll Sentinel */}
      <div ref={observerTarget} className="h-20 w-full" />

      {status === 'LoadingMore' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <FolderSkeleton key={`loading-more-${i}`} />
          ))}
        </div>
      )}

      {status !== 'CanLoadMore' && results.length > 0 &&  (
        <p className="text-center text-xs text-muted-foreground pb-10">
          That's all your starred items.
        </p>
      )}
    </div>
  )
}
