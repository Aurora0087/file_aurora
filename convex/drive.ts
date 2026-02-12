import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { authComponent } from './auth'
import { paginationOptsValidator } from 'convex/server'
import { Doc, Id } from './_generated/dataModel'

const S3_HOSTNAME = 'http://localhost:4566'
const BUCKET_NAME = 'my-local-drive'

const FREE_GB_IN_BYTES = 10 * 1024 * 1024 * 1024

// --- Create a Folder ---
export const createFolder = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id('driveItems')),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    const trimmedName = args.name.trim()

    // 1. Check if folder already exists in this specific location
    const existingFolder = await ctx.db
      .query('driveItems')
      .withIndex('by_parent', (q) =>
        q.eq('userId', user._id).eq('parentId', args.parentId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('name'), trimmedName),
          q.eq(q.field('type'), 'folder'),
          q.eq(q.field('isDeleted'), false), // Only block if not in trash
        ),
      )
      .first()

    if (existingFolder) {
      throw new ConvexError({
        message: 'A folder with this name already exists here.',
        code: 401,
      })
    }

    let parentPath = '/'

    // 2. Handle Parent logic
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId)
      if (!parent || parent.type !== 'folder')
        throw new ConvexError({ message: 'Parent folder not found', code: 404 })

      parentPath =
        parent.path === '/'
          ? `/${parent.name}`
          : `${parent.path}/${parent.name}`
    }

    const now = Date.now()

    // 3. Create the folder
    return await ctx.db.insert('driveItems', {
      type: 'folder',
      name: trimmedName,
      parentId: args.parentId,
      userId: user._id,
      path: parentPath,
      color: args.color,
      lastEdited: now,
      lastOpened: now,
      isPublic: false,
      isStarred: false, // Match your schema field name
      isDeleted: false,
    })
  },
})

export const createFile = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id('driveItems')),
    storageKey: v.string(),
    size: v.number(),
    mimeType: v.string(),
    versionId: v.optional(v.string()), // From S3
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    // 2. Validate Parent Folder (if provided)
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId)
      if (!parent || parent.type !== 'folder') {
        throw new ConvexError({
          message: 'Target is not a valid folder',
          code: 401,
        })
      }
      if (parent.userId !== user._id) {
        throw new ConvexError({
          message: 'Access denied to target folder',
          code: 403,
        })
      }
    }

    // 3. Optional: Handle Duplicate Names in the same folder
    // Logic: If file exists, we could either throw error OR
    // let it be created (S3 Versioning handles the actual storage)
    const existing = await ctx.db
      .query('driveItems')
      .withIndex('by_parent', (q) =>
        q.eq('userId', user._id).eq('parentId', args.parentId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field('name'), args.name),
          q.eq(q.field('type'), 'file'),
          q.eq(q.field('isDeleted'), false),
        ),
      )
      .first()

    const now = Date.now()

    if (existing) {
      // Update the existing record (Standard Drive behavior)

      const lastVer = await ctx.db
        .query('fileVersions')
        .withIndex('by_file', (q) => q.eq('fileId', existing._id))
        .filter((q) => q.eq(q.field('versionId'), 'latest'))
        .first()

      if (lastVer) {
        const vId = crypto.randomUUID()
        await ctx.db.patch(lastVer._id, {
          versionId: vId,
        })
      }

      const newVer = await ctx.db.insert('fileVersions', {
        fileId: existing._id,
        userId: user._id,
        storageKey: args.storageKey || '',
        versionId: args.versionId || 'latest',
        size: args.size || 0,
        createdAt: now,
        thumbnailUrl: existing.thumbnailUrl,
        isDeleted: false,
      })

      await ctx.db.patch(existing._id, {
        currentVersionId: newVer,
        size: args.size,
        storageKey: args.storageKey,
        lastEdited: Date.now(),
      })
      return existing._id
    }

    // 4. Insert New File Record
    const fileId = await ctx.db.insert('driveItems', {
      type: 'file',
      name: args.name,
      userId: user._id,
      parentId: args.parentId,

      // File Metadata
      storageKey: args.storageKey,
      currentVersionId: args.versionId,
      size: args.size,
      mimeType: args.mimeType,

      // Initial States
      isPublic: false,
      isStarred: false,
      isDeleted: false,
      lastEdited: now,
      lastOpened: now,
    })

    // 5. Save initial version to history table (Recommended)
    const newVer = await ctx.db.insert('fileVersions', {
      fileId: fileId,
      userId: user._id,
      storageKey: args.storageKey,
      versionId: args.versionId || 'latest',
      size: args.size,
      createdAt: now,
      thumbnailUrl: '',
      isDeleted: false,
    })

    await ctx.db.patch(fileId, {
      currentVersionId: newVer,
    })

    return fileId
  },
})

export const updateThumbnail = mutation({
  args: {
    id: v.id('driveItems'),
    thumbnailUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate (Worker or User)
    // If your worker is passing the user's JWT (via setAuth), this works:
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError('Unauthorized')

    const item = await ctx.db.get(args.id)

    // 2. Safety Checks
    if (!item) throw new ConvexError('Item not found')
    if (item.userId !== user._id) throw new ConvexError('Access denied')
    if (item.type !== 'file')
      throw new ConvexError('Only files can have thumbnails')

    // 3. Update the main record (driveItems)
    await ctx.db.patch(args.id, {
      thumbnailUrl: args.thumbnailUrl,
    })

    // 4. Update the latest version (fileVersions)
    // We find the most recent version of this file and attach the thumbnail
    const latestVersion = await ctx.db
      .query('fileVersions')
      .withIndex('by_file', (q) => q.eq('fileId', args.id))
      .order('desc')
      .first()

    if (latestVersion) {
      await ctx.db.patch(latestVersion._id, {
        thumbnailUrl: args.thumbnailUrl,
      })
    }

    return { success: true }
  },
})

// --- List Items (Files & Folders) ---
export const list = query({
  args: {
    parentId: v.optional(v.id('driveItems')),
    sortBy: v.union(
      v.literal('a-z'),
      v.literal('z-a'),
      v.literal('newest'),
      v.literal('oldest'),
      v.literal('last-opened'),
      v.literal('last-edited'),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return { page: [], isDone: true, continueCursor: '' }

    if (args.parentId) {
      const parentFolder = await ctx.db.get(args.parentId)
      if (!parentFolder)
        throw new ConvexError({ message: 'Folder not found', code: 404 })

      const isOwner = parentFolder.userId === user._id
      const isPublic = parentFolder.isPublic === true

      if (!isOwner && !isPublic) {
        throw new ConvexError({ message: 'Access denied', code: 403 })
      }
    }

    let driveQuery

    // Sorting uses the indexes defined in your combined schema
    if (args.sortBy === 'a-z' || args.sortBy === 'z-a') {
      driveQuery = ctx.db
        .query('driveItems')
        .withIndex('by_name', (q) => q.eq('userId', user._id))
        .order(args.sortBy === 'a-z' ? 'asc' : 'desc')
    } else if (args.sortBy === 'last-opened') {
      driveQuery = ctx.db
        .query('driveItems')
        .withIndex('by_user_recents', (q) => q.eq('userId', user._id))
        .order('desc')
    } else {
      // Default newest/oldest
      driveQuery = ctx.db
        .query('driveItems')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order(args.sortBy === 'newest' ? 'desc' : 'asc')
    }

    const results = await driveQuery
      .filter((q) => q.eq(q.field('parentId'), args.parentId))
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .paginate(args.paginationOpts)

    return {
      ...results,
      page: results.page.map((item) => ({
        ...item,
        thumbnailUrl: item.storageKey
          ? `${S3_HOSTNAME}/${BUCKET_NAME}/${item.thumbnailUrl}`
          : null,
      })),
    }
  },
})

export const getDirectoryContents = query({
  args: {
    folderId: v.union(v.id('driveItems'), v.null()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError('Unauthorized')

    let currentName = 'My Drive'
    let breadcrumbs: { id: Id<'driveItems'> | null; name: string }[] = [
      { id: null, name: 'My Drive' },
    ]

    // 1. Resolve Breadcrumbs and Current Context
    if (args.folderId !== null) {
      const folder = await ctx.db.get(args.folderId)
      if (!folder || folder.type !== 'folder' || folder.userId !== user._id) {
        throw new ConvexError('Folder not found or access denied')
      }

      currentName = folder.name

      // Build full path upwards
      const path: { id: Id<'driveItems'>; name: string }[] = []
      let cursor: Doc<'driveItems'> | null = folder

      while (cursor) {
        path.push({ id: cursor._id, name: cursor.name })
        cursor = cursor.parentId ? await ctx.db.get(cursor.parentId) : null
      }

      // Combine root with the reversed path
      breadcrumbs = [{ id: null, name: 'My Drive' }, ...path.reverse()]
    }

    // 2. Get all Items (Folders and Files) inside this folder
    const items = await ctx.db
      .query('driveItems')
      .withIndex('by_parent', (q) =>
        q.eq('userId', user._id).eq('parentId', args.folderId ?? undefined),
      )
      .filter((q) => q.eq(q.field('isDeleted'), false))
      .collect()

    // 3. Transform and Separate Folders vs Files
    const folders = items
      .filter((i) => i.type === 'folder')
      .map((f) => ({
        id: f._id,
        name: f.name,
        color: f.color || 'current',
      }))

    const files = items
      .filter((i) => i.type === 'file')
      .map((f) => ({
        id: f._id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        thumbnailUrl: `${S3_HOSTNAME}/${BUCKET_NAME}/${f.thumbnailUrl}`,
        isStarred: f.isStarred,
        isPublic: f.isPublic,
      }))

    return {
      current: {
        id: args.folderId,
        name: currentName,
      },
      breadcrumbs,
      folders,
      files,
    }
  },
})

export const getFileDetails = query({
  args: {
    fileId: v.id('driveItems'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError('Unauthorized')

    // 1. Fetch the File
    const file = await ctx.db.get(args.fileId)

    if (!file || file.type !== 'file') {
      throw new ConvexError('File not found')
    }

    // Security: Check ownership or public status
    if (file.userId !== user._id && !file.isPublic) {
      throw new ConvexError('Access denied')
    }

    // 2. Fetch Parent Folder Details
    let parentDetails = null
    if (file.parentId) {
      const parent = await ctx.db.get(file.parentId)
      if (parent) {
        parentDetails = {
          id: parent._id,
          name: parent.name,
        }
      }
    } else {
      parentDetails = {
        id: null,
        name: 'My Drive',
      }
    }

    // 3. Fetch all Versions (Sorted by newest first)
    const versions = await ctx.db
      .query('fileVersions')
      .withIndex('by_file', (q) => q.eq('fileId', args.fileId))
      .order('desc')
      .collect()

    // 4. Combine and Transform with S3 URLs
    return {
      file: {
        ...file,
        url: `${S3_HOSTNAME}/${BUCKET_NAME}/${file.storageKey}`,
        // Note: Thumbnail might already be a full URL if saved by the worker,
        // but we handle both cases here.
        thumbnail: file.thumbnailUrl?.startsWith('http')
          ? file.thumbnailUrl
          : file.thumbnailUrl
            ? `${S3_HOSTNAME}/${BUCKET_NAME}/${file.thumbnailUrl}`
            : null,
      },
      parent: parentDetails,
      versions: versions
        .filter((v) => !v.isDeleted) // Don't show binned versions
        .map((v) => ({
          ...v,
          url: `${S3_HOSTNAME}/${BUCKET_NAME}/${v.storageKey}`,
          thumbnail: v.thumbnailUrl?.startsWith('http')
            ? v.thumbnailUrl
            : v.thumbnailUrl
              ? `${S3_HOSTNAME}/${BUCKET_NAME}/${v.thumbnailUrl}`
              : null,
        })),
    }
  },
})

export const ensurePlan = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return

    const existingPlan = await ctx.db
      .query('plans')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    if (!existingPlan) {
      await ctx.db.insert('plans', {
        userId: user._id,
        maxStorage: FREE_GB_IN_BYTES,
        type: 'free',
        exp: undefined,
      })
    }
  },
})

export const userPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return null

    // 1. Fetch the user's plan
    const plan = await ctx.db
      .query('plans')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first()

    // 2. Define the plan details (Default to Free if not found)
    const planData = plan ?? {
      type: 'free' as const,
      maxStorage: FREE_GB_IN_BYTES,
      exp: undefined,
    }

    // 3. Calculate Storage Used in driveItems (Latest files)
    const driveItems = await ctx.db
      .query('driveItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('type'), 'file'))
      .collect()

    const currentFilesSize = driveItems.reduce(
      (acc, item) => acc + (item.size ?? 0),
      0,
    )

    // 4. Calculate Storage Used by File Versions
    // Note: Assuming you added a 'userId' index to fileVersions for efficiency
    const allVersions = await ctx.db
      .query('fileVersions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect()

    const versionsSize = allVersions.reduce(
      (acc, version) => acc + (version.size ?? 0),
      0,
    )

    const totalUsed = currentFilesSize + versionsSize

    return {
      maxStorage: planData.maxStorage,
      planType: planData.type,
      usedStorage: totalUsed,
      usagePercentage: (totalUsed / planData.maxStorage) * 100,
      expiresAt: planData.exp,
    }
  },
})

export const recentOpendList = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return { page: [], isDone: true, continueCursor: '' }

    const results = await ctx.db
      .query('driveItems')
      .withIndex('by_user_recents', (q) => q.eq('userId', user._id))
      .order('desc') // Most recently opened first
      .filter((q) => q.eq(q.field('isDeleted'), false)) // Don't show trashed items
      .paginate(args.paginationOpts)

    return {
      ...results,
      page: results.page.map((item) => ({
        ...item,
        // If it's a file and has a storageKey, prepend the LocalStack URL
        thumbnail: item.storageKey
          ? `${S3_HOSTNAME}/${BUCKET_NAME}/${item.thumbnailUrl}`
          : null,
      })),
    }
  },
})

export const startedList = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return { page: [], isDone: true, continueCursor: '' }

    const results = await ctx.db
      .query('driveItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field('isStarred'), true), // Only Starred
          q.eq(q.field('isDeleted'), false), // Not in Bin
        ),
      )
      .order('desc')
      .paginate(args.paginationOpts)

    return {
      ...results,
      page: results.page.map((item) => ({
        ...item,
        // If it's a file and has a storageKey, prepend the LocalStack URL
        thumbnailUrl: item.storageKey
          ? `${S3_HOSTNAME}/${BUCKET_NAME}/${item.thumbnailUrl}`
          : null,
      })),
    }
  },
})

export const binnedList = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return { page: [], isDone: true, continueCursor: '' }

    const results = await ctx.db
      .query('driveItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('isDeleted'), true)) // Only items in Trash
      .order('desc') // Sorted by most recently moved to trash
      .paginate(args.paginationOpts)

    return {
      ...results,
      page: results.page.map((item) => ({
        ...item,
        // If it's a file and has a storageKey, prepend the LocalStack URL
        thumbnailUrl: item.storageKey
          ? `${S3_HOSTNAME}/${BUCKET_NAME}/${item.thumbnailUrl}`
          : null,
      })),
    }
  },
})

export const parentFolders = query({
  args: {
    folderId: v.id('driveItems'),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) return []

    const breadcrumbs: { id: Id<'driveItems'>; name: string }[] = []
    let currentId: Id<'driveItems'> | undefined = args.folderId

    while (currentId) {
      const item: Doc<'driveItems'> | null = await ctx.db.get(currentId)
      if (!item || item.userId !== user._id) break

      breadcrumbs.push({ id: item._id, name: item.name })
      currentId = item.parentId
    }

    return breadcrumbs.reverse()
  },
})

export const rename = mutation({
  args: { id: v.id('driveItems'), newName: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    const item = await ctx.db.get(args.id)
    if (!item || item.userId !== user._id)
      throw new ConvexError('Access denied')

    await ctx.db.patch(args.id, {
      name: args.newName.trim(),
      lastEdited: Date.now(),
    })
  },
})

export const changeColor = mutation({
  args: { id: v.id('driveItems'), newColor: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    const item = await ctx.db.get(args.id)
    if (!item || item.type !== 'folder')
      throw new ConvexError({ message: 'Only folders can have colors' })

    await ctx.db.patch(args.id, { color: args.newColor })
  },
})

export const move = mutation({
  args: {
    itemId: v.id('driveItems'),
    targetFolderId: v.optional(v.id('driveItems')),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    const item = await ctx.db.get(args.itemId)
    if (!item || item.userId !== user._id)
      throw new ConvexError({ message: 'Access denied', code: 403 })

    if (args.itemId === args.targetFolderId)
      throw new ConvexError({ message: 'Cannot move into itself', code: 401 })

    await ctx.db.patch(args.itemId, {
      parentId: args.targetFolderId,
      lastEdited: Date.now(),
    })
  },
})

export const adminMove = mutation({
  args: {
    itemId: v.id('driveItems'),
    targetFolderId: v.optional(v.id('driveItems')),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId)
    if (!item) throw new ConvexError({ message: 'Item dont exis', code: 404 })

    if (args.itemId === args.targetFolderId)
      throw new ConvexError({ message: 'Cannot move into itself', code: 401 })

    await ctx.db.patch(args.itemId, {
      parentId: args.targetFolderId,
      lastEdited: Date.now(),
    })
  },
})

// --- Batch Operations (Starred / Public / Trash) ---

export const toggleStarred = mutation({
  args: {
    list: v.array(v.object({ id: v.id('driveItems') })),
    state: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    for (const item of args.list) {
      const doc = await ctx.db.get(item.id)
      if (doc && doc.userId === user._id) {
        // Restriction: Cannot make stared if currently in Trash
        // We only block this if the user is trying to set isPublic to TRUE
        if (args.state && doc.isDeleted) {
          throw new ConvexError({
            message: `Cannot make "${doc.name}" starred while it is in the bin. Please restore it first.`,
          })
        }
        await ctx.db.patch(item.id, {
          isStarred: args.state,
          lastEdited: Date.now(),
        })
      }
    }
  },
})

export const togglePublic = mutation({
  args: {
    list: v.array(v.object({ id: v.id('driveItems') })),
    state: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    // Initialize the queue with the IDs provided in the list
    const queue = [...args.list.map((item) => item.id)]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const doc = await ctx.db.get(currentId)

      // Security check: Only update if the item exists and belongs to the user
      if (doc && doc.userId === user._id) {
        // Restriction: Cannot make root items public if they are in the Trash
        // Note: We only check isDeleted for the initial items in the list,
        // as nested children don't need individual trash checks if the parent is being toggled.
        if (
          args.state &&
          doc.isDeleted &&
          queue.length === args.list.length - 1
        ) {
          throw new ConvexError({
            message: `Cannot make "${doc.name}" public while it is in the bin. Please restore it first.`,
          })
        }

        // 1. Update the current item's privacy status
        await ctx.db.patch(currentId, {
          isPublic: args.state,
          lastEdited: Date.now(),
        })

        // 2. If it's a folder, find all children and add them to the queue
        if (doc.type === 'folder') {
          const children = await ctx.db
            .query('driveItems')
            .withIndex('by_parent', (q) =>
              q.eq('userId', user._id).eq('parentId', currentId),
            )
            .collect()

          for (const child of children) {
            queue.push(child._id)
          }
        }
      }
    }
  },
})

export const toggleTrash = mutation({
  args: {
    list: v.array(v.object({ id: v.id('driveItems') })),
    state: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    for (const item of args.list) {
      const doc = await ctx.db.get(item.id)

      if (doc && doc.userId === user._id) {
        // Block moving to trash if the item is starred
        // We only check this if 'state' is true (moving TO trash)
        if (args.state && doc.isStarred) {
          throw new ConvexError({
            message: `Cannot move "${doc.name}" to the bin because it is starred. Please unstar it first.`,
          })
        }

        await ctx.db.patch(item.id, {
          isDeleted: args.state,
          lastEdited: Date.now(),
        })
      }
    }
  },
})

export const deletePermanently = mutation({
  args: {
    list: v.array(v.object({ id: v.id('driveItems') })),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    const s3KeysToDelete: { storageKey: string }[] = []
    const idsToDelete = [...args.list.map((i) => i.id)]

    // We use a processing queue to handle recursive folder deletion
    const queue = [...idsToDelete]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const item = await ctx.db.get(currentId)

      // Security & Validation
      if (!item || item.userId !== user._id) continue

      // We only allow permanent deletion if the root items passed in are in the trash
      // Note: For children of a trashed folder, we don't strictly need to check isDeleted
      // because the parent already satisfies the "Trash" requirement.
      if (item.isDeleted === false && idsToDelete.includes(currentId)) {
        throw new ConvexError({
          message: `Item "${item.name}" must be in the bin to be permanently deleted.`,
        })
      }

      if (item.type === 'file') {
        // 1. Collect file keys from the main record
        if (item.storageKey) {
          s3KeysToDelete.push({
            storageKey: item.storageKey,
          })
        }
        if (item.thumbnailUrl) {
          s3KeysToDelete.push({
            storageKey: item.thumbnailUrl,
          })
        }

        // 2. Find and collect all historical versions for this file
        const versions = await ctx.db
          .query('fileVersions')
          .withIndex('by_file', (q) => q.eq('fileId', item._id))
          .collect()

        for (const version of versions) {
          if (version.thumbnailUrl) {
            s3KeysToDelete.push({ storageKey: version.thumbnailUrl })
          }
          s3KeysToDelete.push({
            storageKey: version.storageKey,
          })
          // Delete version record
          await ctx.db.delete(version._id)
        }
      } else {
        // 3. If it's a folder, find all its immediate children and add to queue
        const children = await ctx.db
          .query('driveItems')
          .withIndex('by_parent', (q) =>
            q.eq('userId', user._id).eq('parentId', item._id),
          )
          .collect()

        for (const child of children) {
          queue.push(child._id)
        }
      }

      // 4. Finally, delete the driveItem record (File or Folder)
      await ctx.db.delete(item._id)
    }

    // Return the list of S3 keys
    return s3KeysToDelete.map((k) => k.storageKey)
  },
})

export const emtyTrashItems = mutation({
  args: {}, // No args needed as we are emptying everything for the user
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 });

    // Use a Set to store unique S3 keys to avoid duplicate deletion requests
    const s3KeysToDelete = new Set<string>();

    // 1. Find all top-level items currently marked as deleted for this user
    const trashedItems = await ctx.db
      .query('driveItems')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('isDeleted'), true))
      .collect();

    // Initialize the processing queue with the IDs found in the trash
    const queue = trashedItems.map((item) => item._id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const item = await ctx.db.get(currentId);

      // Security & skip if already deleted in this loop (e.g. child was also in trash query)
      if (!item || item.userId !== user._id) continue;

      if (item.type === 'file') {
        // 2. Collect S3 keys from the main record
        if (item.storageKey) s3KeysToDelete.add(item.storageKey);
        if (item.thumbnailUrl) s3KeysToDelete.add(item.thumbnailUrl);

        // 3. Find and collect all historical versions for this file
        const versions = await ctx.db
          .query('fileVersions')
          .withIndex('by_file', (q) => q.eq('fileId', item._id))
          .collect();

        for (const version of versions) {
          if (version.storageKey) s3KeysToDelete.add(version.storageKey);
          if (version.thumbnailUrl) s3KeysToDelete.add(version.thumbnailUrl);
          
          // Delete version record from DB
          await ctx.db.delete(version._id);
        }
      } else {
        // 4. If it's a folder, find ALL children (even if child isDeleted is false)
        // because we are deleting the parent folder permanently.
        const children = await ctx.db
          .query('driveItems')
          .withIndex('by_parent', (q) =>
            q.eq('userId', user._id).eq('parentId', item._id),
          )
          .collect();

        for (const child of children) {
          queue.push(child._id);
        }
      }

      // 5. Finally, delete the driveItem record itself
      await ctx.db.delete(item._id);
    }

    // Convert Set back to an array for the RabbitMQ worker
    return Array.from(s3KeysToDelete);
  },
});

// flows
export const createFlow = mutation({
  args: {
    folderId: v.id('driveItems'),
    isActive: v.boolean(),
    triggerType: v.literal('file_upload'),
    // This represents the array of flows generated by your UI
    flows: v.array(
      v.object({
        filter: v.object({
          field: v.string(),
          operator: v.string(),
          value: v.string(),
        }),
        actions: v.array(
          v.object({
            type: v.string(),
            extraData: v.optional(v.string()), // Stringified JSON (targetFolder, quality, etc)
          }),
        ),
      }),
    ),
  },
  async handler(ctx, args) {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    // 1. Security Check: Ensure user owns the folder they are setting a rule for
    const folder = await ctx.db.get(args.folderId)
    if (!folder || folder.userId !== user._id) {
      throw new ConvexError('Folder not found or access denied')
    }

    // 2. Find if a rule already exists for this folder
    const existingRule = await ctx.db
      .query('folderRules')
      .withIndex('by_folderId', (q) => q.eq('folderId', args.folderId))
      .first()

    let ruleId: Id<'folderRules'>

    if (existingRule) {
      // 3a. Update the existing rule (toggle active state or trigger type)
      ruleId = existingRule._id
      await ctx.db.patch(ruleId, {
        isActive: args.isActive,
        triggerType: args.triggerType,
      })

      // 4a. Sync Flows: Remove old flows to replace them with the new configuration
      const oldFlows = await ctx.db
        .query('folderRuleFlows')
        .withIndex('by_ruleId', (q) => q.eq('ruleId', ruleId))
        .collect()

      for (const flow of oldFlows) {
        await ctx.db.delete(flow._id)
      }
    } else {
      // 3b. Create a new root rule
      ruleId = await ctx.db.insert('folderRules', {
        folderId: args.folderId,
        isActive: args.isActive,
        userId: user._id,
        triggerType: args.triggerType,
      })
    }

    // 5. Insert the new flows into the database
    // We map over the flows and insert them individually
    const flowInsertions = args.flows.map((flow) =>
      ctx.db.insert('folderRuleFlows', {
        ruleId,
        userId: user._id,
        filter: flow.filter,
        actions: flow.actions,
      }),
    )

    await Promise.all(flowInsertions)

    return {
      success: true,
      message: existingRule ? 'Flow updated' : 'Flow created',
      ruleId,
    }
  },
})

export const updateFlow = mutation({
  args: {
    ruleId: v.id('folderRules'),
    isActive: v.boolean(),
    triggerType: v.literal('file_upload'),
    // The new set of flows from the UI
    flows: v.array(
      v.object({
        filter: v.object({
          field: v.string(),
          operator: v.string(),
          value: v.string(),
        }),
        actions: v.array(
          v.object({
            type: v.string(),
            extraData: v.optional(v.string()), // Stringified settings
          }),
        ),
      }),
    ),
  },
  async handler(ctx, args) {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    // 1. Fetch the existing rule and verify ownership
    const existingRule = await ctx.db.get(args.ruleId)

    if (!existingRule || existingRule.userId !== user._id) {
      throw new ConvexError({
        message: 'Rule not found or access denied',
        code: 404,
      })
    }

    // 2. Update the root rule (status and trigger type)
    await ctx.db.patch(args.ruleId, {
      isActive: args.isActive,
      triggerType: args.triggerType,
    })

    // This "clears the canvas" in the database before saving the new design
    const currentFlows = await ctx.db
      .query('folderRuleFlows')
      .withIndex('by_ruleId', (q) => q.eq('ruleId', args.ruleId))
      .collect()

    for (const flow of currentFlows) {
      await ctx.db.delete(flow._id)
    }

    // 4. Insert the new flows
    const insertions = args.flows.map((flow) =>
      ctx.db.insert('folderRuleFlows', {
        ruleId: args.ruleId,
        userId: user._id,
        filter: flow.filter,
        actions: flow.actions,
      }),
    )

    await Promise.all(insertions)

    return {
      success: true,
      message: 'Workflow updated successfully',
    }
  },
})

export const getFlow = query({
  args: {
    folderId: v.id('driveItems'),
  },
  async handler(ctx, args) {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

      const folder = await ctx.db.query('driveItems')
      .withIndex('by_id',(q)=>q.eq('_id',args.folderId))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first();

      if (!folder) {
        return null
      }
    // 1. Fetch the root rule for this folder
    const rule = await ctx.db
      .query('folderRules')
      .withIndex('by_folderId', (q) => q.eq('folderId', args.folderId))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first()

    // If no rule exists yet, return null so the UI can show a default state
    if (!rule) {
      return {
        folderName:folder.name,
      color:folder.color,
      rule:null
      }
    }

    // 2. Fetch all flows (filters + actions) associated with this rule
    const flows = await ctx.db
      .query('folderRuleFlows')
      .withIndex('by_ruleId', (q) => q.eq('ruleId', rule._id))
      .collect()

    // 3. Return a combined object
    return {
      folderName:folder.name,
      color:folder.color,
      rule:{
      ruleId: rule._id,
      isActive: rule.isActive,
      triggerType: rule.triggerType,
      // We return the flows exactly as they are stored
      flows: flows.map((f) => ({
        id: f._id,
        filter: f.filter,
        actions: f.actions.map((a) => ({
          type: a.type,
          settings: a.extraData ? JSON.parse(a.extraData) : {},
        })),
      })),
    }}
  },
})

export const deleteFlow = mutation({
  args: {
    folderId: v.id('driveItems'),
  },
  async handler(ctx, args) {
    const user = await authComponent.getAuthUser(ctx)
    if (!user) throw new ConvexError({ message: 'Unauthorized', code: 403 })

    // 1. Find the rule associated with this folder
    const existingRule = await ctx.db
      .query('folderRules')
      .withIndex('by_folderId', (q) => q.eq('folderId', args.folderId))
      .filter((q) => q.eq(q.field('userId'), user._id))
      .first()

    if (!existingRule) {
      return { success: true, message: 'No flow found to delete' }
    }

    // 2. Fetch all flows (filters/actions) linked to this rule
    const associatedFlows = await ctx.db
      .query('folderRuleFlows')
      .withIndex('by_ruleId', (q) => q.eq('ruleId', existingRule._id))
      .collect()

    // 3. Delete all associated flows
    for (const flow of associatedFlows) {
      await ctx.db.delete(flow._id)
    }

    // 4. Delete the root rule
    await ctx.db.delete(existingRule._id)

    return {
      success: true,
      message: 'Workflow deleted successfully',
    }
  },
})

export const getMatchingFlows = query({
  args: { fileId: v.id('driveItems') },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId)

    if (!file || file.type !== 'file') return null

    // 1. Find the active rule for the parent folder
    // Note: Use parentId! or fallback to a specific root ID if applicable
    const rule = await ctx.db
      .query('folderRules')
      .withIndex('by_folderId', (q) =>
        q.eq('folderId', file.parentId!).eq('isActive', true),
      )
      .first()

    if (!rule) return null

    // 2. Fetch all flows for this rule
    const flows = await ctx.db
      .query('folderRuleFlows')
      .withIndex('by_ruleId', (q) => q.eq('ruleId', rule._id))
      .collect()

      console.log(flows);
      

    // 3. Filter flows based on file metadata and your defined operators
    const matchingActions = flows
      .filter((flow) => {
        const { field, operator, value } = flow.filter
        const fileName = file.name.toLowerCase()
        const filterValue = value.toLowerCase()

        // --- Field: Name ---
        if (field === 'name') {
          switch (operator) {
            case 'eq':
              return fileName === filterValue
            case 'contains':
              return fileName.includes(filterValue)
            case 'starts_with':
              return fileName.startsWith(filterValue)
            case 'ends_with':
              return fileName.endsWith(filterValue)
            default:
              return false
          }
        }

        // --- Field: Extension ---
        if (field === 'extension') {
          const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
          // Clean the filter value in case user typed ".png" instead of "png"
          const cleanValue = filterValue.replace('.', '')
          if (operator === 'eq') return fileExt === cleanValue
        }

        // --- Field: Media Type ---
        if (field === 'media_type' && file.mimeType) {
          const type = file.mimeType.split('/')[0].toLowerCase() // 'image' or 'video'
          if (operator === 'eq') return type === filterValue
        }

        // --- Field: Size ---
        if (field === 'size' && file.size !== undefined) {
          const fileSizeMB = file.size / (1024 * 1024)
          const targetSize = parseFloat(value)
          if (operator === 'gt') return fileSizeMB > targetSize
        }

        return false
      })
      .flatMap((flow) =>
        flow.actions.map((a) => ({
          ...a,
          settings: a.extraData ? JSON.parse(a.extraData) : {},
        })),
      )

    return matchingActions.length > 0 ? matchingActions : null
  },
})

export const updateFileAfterProcessing = mutation({
  args: {
    id: v.id('driveItems'),
    newStorageKey: v.string(),
    newSize: v.number(),
    mimeType: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      storageKey: args.newStorageKey,
      size: args.newSize,
      lastEdited: Date.now(),
      mimeType: args.mimeType,
      name: args.name,
    })
  },
})


// public

export const createPublicLink = mutation({
  args: {
    fileId: v.id("driveItems"),
    duration: v.union(
      v.literal("1h"),
      v.literal("1d"),
      v.literal("7d"),
      v.literal("never")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Unauthorized");

    // Calculate expiration
    let expiresAt: number | undefined;
    const now = Date.now();
    if (args.duration === "1h") expiresAt = now + 60 * 60 * 1000;
    else if (args.duration === "1d") expiresAt = now + 24 * 60 * 60 * 1000;
    else if (args.duration === "7d") expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    // Generate unique token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(3, 15);

    // Check if a link already exists and update it, or create new
    const existing = await ctx.db
      .query("publicLinks")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { token, expiresAt });
      return token;
    }

    await ctx.db.insert("publicLinks", {
      fileId: args.fileId,
      token,
      expiresAt,
    });

    return token;
  },
});

export const getPublicLink = query({
  args: { fileId: v.id("driveItems") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("publicLinks")
      .filter((q) => q.eq(q.field("fileId"), args.fileId))
      .first();
  },
});

export const getSharedItems = query({
  args: {
    token: v.string(),
    folderId: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // 1. Find the Public Link by Token
    const link = await ctx.db
      .query("publicLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) throw new ConvexError({message:"Share link not found",code :404});

    // 2. Check Expiration
    if (link.expiresAt && Date.now() > link.expiresAt) {
      throw new ConvexError({message:"This share link has expired",code:403});
    }

    // 3. Get the Root Shared Item (The item the link was created for)
    const sharedRoot = await ctx.db.get(link.fileId);
    if (!sharedRoot || sharedRoot.isDeleted) {
      throw new ConvexError({message:"The shared item no longer exists",code:404});
    }

    // 4. Determine which folder's content to show
    let targetParentId: Id<"driveItems">;

    if (args.folderId) {
      const requestedFolderId = args.folderId as Id<"driveItems">;

      // Security Check: Is the requested folder a descendant of the shared root?
      const isAuthorized = await checkIsDescendant(ctx, requestedFolderId, sharedRoot._id);
      
      if (!isAuthorized && requestedFolderId !== sharedRoot._id) {
        throw new ConvexError({message:"Access denied to this folder",code:403});
      }
      
      targetParentId = requestedFolderId;
    } else {
      // If shared item is a file, return just that file metadata
      if (sharedRoot.type === "file") {
        return {
          page: [sharedRoot],
          isDone: true,
          continueCursor: "",
          rootInfo: sharedRoot
        };
      }
      // If no folderId provided and root is folder, show root's contents
      targetParentId = sharedRoot._id;
    }

    // 5. Fetch children for the target folder
    // Note: We use the userId of the owner of the shared item to use the index
    const results = await ctx.db
      .query("driveItems")
      .withIndex("by_parent", (q) => 
        q.eq("userId", sharedRoot.userId).eq("parentId", targetParentId)
      )
      .order('desc')
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .paginate(args.paginationOpts);

    return {
      ...results,
      page: results.page.map((item) => ({
        ...item,
        thumbnailUrl: item.storageKey
          ? `${S3_HOSTNAME}/${BUCKET_NAME}/${item.thumbnailUrl}`
          : null,
      })),
      rootInfo: sharedRoot, // Return info about the top-level shared item
      currentFolder: await ctx.db.get(targetParentId)
    };
  },
});

/**
 * Helper: Recursively check if a folder is inside the shared root
 */
async function checkIsDescendant(
  ctx: any, 
  currentId: Id<"driveItems">, 
  rootId: Id<"driveItems">
): Promise<boolean> {
  const item = await ctx.db.get(currentId);
  if (!item || !item.parentId) return false;
  if (item.parentId === rootId) return true;
  
  // Recursively walk up the tree
  return await checkIsDescendant(ctx, item.parentId, rootId);
}

// user

export const getUserWithPlan = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) return null;

    // Fetch plan details
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      name: user.name,
      email: user.email,
      avatar: user.image ?? "", // Better Auth uses 'image' field
      plan: plan ?? {
        type: "free",
        maxStorage: 1024 * 1024 * 1024 * 5, // 5GB Default
      },
    };
  },
});

// shearch

export const advancedSearch = query({
  args: {
    paginationOpts: paginationOptsValidator,
    searchText: v.optional(v.string()),
    filters: v.object({
      mimeType: v.optional(v.string()),
      isStarred: v.optional(v.boolean()),
      parentId: v.optional(v.id("driveItems")),
      createdFrom: v.optional(v.number()), // Timestamp
      createdTo: v.optional(v.number()),   // Timestamp
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const userId = user._id;
    let queryBuilder;

    // 1. Use Search Index if text is provided, otherwise use standard User Index
    if (args.searchText) {
      queryBuilder = ctx.db
        .query("driveItems")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.searchText!).eq("userId", userId)
        );
    } else {
      queryBuilder = ctx.db
        .query("driveItems")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    }

    // 2. Apply Advanced Filters
    const results = await queryBuilder
      .filter((q) =>
        q.and(
          // Always exclude deleted items from search results
          q.eq(q.field("isDeleted"), false),

          // MimeType Filter
          args.filters.mimeType
            ? q.eq(q.field("mimeType"), args.filters.mimeType)
            : true,

          // Starred Filter
          args.filters.isStarred !== undefined
            ? q.eq(q.field("isStarred"), args.filters.isStarred)
            : true,

          // Parent Folder Filter
          args.filters.parentId
            ? q.eq(q.field("parentId"), args.filters.parentId)
            : true,

          // Date Range Filters (using built-in _creationTime)
          args.filters.createdFrom
            ? q.gte(q.field("_creationTime"), args.filters.createdFrom)
            : true,
          args.filters.createdTo
            ? q.lte(q.field("_creationTime"), args.filters.createdTo)
            : true
        )
      )
      .paginate(args.paginationOpts);

    // 3. Return only the requested fields
    return {
      ...results,
      page: results.page.map((item) => ({
        id: item._id,
        name: item.name,
        type: item.type,
        mimeType: item.mimeType,
        created: item._creationTime,
        color: item.color,
        isStarred: item.isStarred,
      })),
    };
  },
});