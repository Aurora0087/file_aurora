import FileCard from '@/components/drive/grid-layout/file-card'
import { FileSkeleton } from '@/components/drive/grid-layout/file-skeleton'
import FolderCard from '@/components/drive/grid-layout/folder-card'
import { FolderErrorComponent } from '@/components/drive/grid-layout/folder-error'
import { FolderSkeleton } from '@/components/drive/grid-layout/folder-skeleton'
import DriveWrapperLayout from '@/components/drive/wrapper-layout'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'
import { useEffect, useRef } from 'react'

export const Route = createFileRoute('/drive/__drive/my-drive')({
  component: RouteComponent,
  errorComponent:FolderErrorComponent
})

function RouteComponent() {
  // 1. Fetch combined items (Files & Folders)
  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.list,
    {
      parentId: undefined, // Root directory
      sortBy: 'newest',
    },
    { initialNumItems: 24 },
  )

  // 2. Infinite Scroll Logic
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the sentinel div is visible and we can load more, trigger loadMore
        if (entries[0].isIntersecting && status === 'CanLoadMore') {
          loadMore(15)
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the sentinel is visible
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [status, loadMore])

  return (
    <DriveWrapperLayout >
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-bold px-2">My Drive</h1>

        {/* Empty State */}
        {results.length === 0 && status !== 'LoadingFirstPage' && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-20 text-center">
            <p className="text-muted-foreground">Your drive is empty. Drag and drop files here to upload!</p>
          </div>
        )}

        {/* Combined Grid (Folders and Files) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          
          {/* 1. Initial Loading Skeletons */}
          {status === 'LoadingFirstPage' && (
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <FolderSkeleton key={`skeleton-${i}`} />
              ))}
            </>
          )}

          {/* 2. Polymorphic Rendering of Items */}
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
                mimeType={item.mimeType||""}
                size={item.size||0}
                isPublic={item.isPublic}
                isStarted={item.isStarred}
                 thumbnailUrl={item.thumbnailUrl || ''}
                isTrashed={item.isDeleted}
              />
            )
          })}

          {/* 3. Loading More Skeletons (Appears at the end of the list while fetching) */}
          {status === 'LoadingMore' && (
             <>
              {Array.from({ length: 4 }).map((_, i) => (
                <FileSkeleton key={`loading-more-${i}`} />
              ))}
             </>
          )}
        </div>

        {/* 4. Infinite Scroll Sentinel */}
        {/* This invisible div tells us when to load more data */}
        <div ref={observerTarget} className="h-20 w-full" />

        {status !== 'CanLoadMore' && results.length > 0 && (
          <p className="text-center text-xs text-muted-foreground pb-10">
            You've reached the end of your drive.
          </p>
        )}
      </div>
    </DriveWrapperLayout>
  )
}
