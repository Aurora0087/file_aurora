import FolderBreadcrumbs from '@/components/drive/folder-Breadcrumbs'
import FileCard from '@/components/drive/grid-layout/file-card'
import FolderCard from '@/components/drive/grid-layout/folder-card'
import { FolderErrorComponent } from '@/components/drive/grid-layout/folder-error'
import { FolderSkeleton } from '@/components/drive/grid-layout/folder-skeleton'
import DriveWrapperLayout from '@/components/drive/wrapper-layout'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'

export const Route = createFileRoute('/drive/__drive/folder/$folderid/')({
  component: RouteComponent,
  errorComponent: FolderErrorComponent,
})

function RouteComponent() {
  const { folderid } = Route.useParams()

  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.list,
    {
      parentId: folderid as any,
      sortBy: 'newest',
    },
    { initialNumItems: 24 },
  )

  return (
    <DriveWrapperLayout folderid={folderid}>
      <div className="p-4 h-full space-y-6">
        <div className=" pb-4 flex justify-between gap-4 items-center">
          <FolderBreadcrumbs folderId={folderid} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {/* 1. Show Skeletons while loading the first page */}
          {status === 'LoadingFirstPage' && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <FolderSkeleton key={i} />
              ))}
            </>
          )}

          {/* 2. Show Results if they exist */}
          {status !== 'LoadingFirstPage' && results.length > 0 && (
            <>
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
            </>
          )}
        </div>

        {/* 3. Empty State */}
        {status !== 'LoadingFirstPage' && results.length === 0 && (
          <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed select-none">
            <p className="text-muted-foreground text-sm">
              This folder is empty
            </p>
          </div>
        )}

        {/* 4. Load More Skeletons (Optional: Show skeletons while loading more) */}
        {status === 'LoadingMore' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <FolderSkeleton key={`more-${i}`} />
            ))}
          </div>
        )}

        {/* 5. Load More Button */}
        {status === 'CanLoadMore' && (
          <button
            onClick={() => loadMore(20)}
            className="mt-8 rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Load More
          </button>
        )}
      </div>
    </DriveWrapperLayout>
  )
}
