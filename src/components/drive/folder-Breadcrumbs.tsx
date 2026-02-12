import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

function FolderBreadcrumbs({ folderId }: { folderId: string }) {
  const parents = useQuery(api.drive.parentFolders, {
    folderId: folderId as any,
  })

  if (!parents) return null

  return (
    <Breadcrumb className=" mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link
              to="/drive/my-drive"
              className="hover:text-primary text-xl"
            >
              My Drive
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {parents !== undefined &&
          parents.map((p) => {
            return (
              <div key={p.id} className="flex items-center w-fit gap-3">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      to="/drive/folder/$folderid"
                      params={ {folderid: p.id} }
                      className="hover:text-primary text-xl"
                      title={`Go to ${p.name}`}
                    >
                      {p.name}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            )
          })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export default FolderBreadcrumbs