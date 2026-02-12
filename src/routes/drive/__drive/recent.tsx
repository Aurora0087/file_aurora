import FileCard from '@/components/drive/grid-layout/file-card'
import FolderCard from '@/components/drive/grid-layout/folder-card'
import { FolderErrorComponent } from '@/components/drive/grid-layout/folder-error'
import { FolderSkeleton } from '@/components/drive/grid-layout/folder-skeleton'
import { groupItemsByDate } from '@/lib/utils'
import { IconHistory } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { api } from 'convex/_generated/api'
import { usePaginatedQuery } from 'convex/react'
import { useEffect, useMemo, useRef } from 'react'

export const Route = createFileRoute('/drive/__drive/recent')({
  component: RouteComponent,
  errorComponent: FolderErrorComponent,
})

function RouteComponent() {
  // 1. Fetch recently opened items
  const { results, status, loadMore } = usePaginatedQuery(
    api.drive.recentOpendList,
    {},
    { initialNumItems: 24 }, // Start with a decent amount of recents
  )

  const sections = useMemo(() => groupItemsByDate(results), [results])

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

  const RenderSection = ({ title, items }: { title: string; items: any[] }) => {
    if (items.length === 0) return null
    return (
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
          {title}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) =>
            item.type === 'folder' ? (
              <FolderCard
                key={item._id}
                id={item._id}
                color={item.color}
                name={item.name}
                isPublic={item.isPublic}
                isStarted={item.isStarred}
                isTrashed={item.isDeleted}
              />
            ) : (
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
            ),
          )}
        </div>
      </section>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-2 px-2">
        <IconHistory className="text-primary" size={24} />
        <h1 className="text-xl font-bold">Recent activity</h1>
      </header>

      {/* Initial Loading */}
      {status === 'LoadingFirstPage' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <FolderSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Chronological Sections */}
      {results.length > 0 && (
        <div className="space-y-8">
          <RenderSection title="Today" items={sections.today} />
          <RenderSection title="Earlier this week" items={sections.thisWeek} />
          <RenderSection title="Last week" items={sections.lastWeek} />
          <RenderSection title="Last month" items={sections.lastMonth} />
          <RenderSection title="Older" items={sections.older} />
        </div>
      )}

      {/* Empty State */}
      {results.length === 0 && status !== 'LoadingFirstPage' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconHistory size={48} className="text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">No recent activity.</p>
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      <div ref={observerTarget} className="h-20 w-full" />

      {status === 'LoadingMore' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <FolderSkeleton key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
