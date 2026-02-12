import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  plans: defineTable({
    userId: v.string(),
    maxStorage: v.float64(),
    type: v.union(
      v.literal('free'),
      v.literal('lite'),
      v.literal('basic'),
      v.literal('Standard'),
    ),
    exp: v.optional(v.number()),
    razorpayUserId: v.optional(v.string()),
  }).index('by_user', ['userId']),
  // --- File & Folder Management ---
  driveItems: defineTable({
    // --- Common Fields ---
    type: v.union(v.literal('file'), v.literal('folder')),
    name: v.string(),
    userId: v.string(),
    parentId: v.optional(v.id('driveItems')), // Recursive parent

    isPublic: v.boolean(),
    isStarred: v.boolean(),
    isDeleted: v.boolean(),

    lastEdited: v.number(),
    lastOpened: v.number(),

    // --- Folder Specific ---
    color: v.optional(v.string()),
    path: v.optional(v.string()),

    // --- File Specific ---
    storageKey: v.optional(v.string()), // S3 Key
    currentVersionId: v.optional(v.string()), // S3 Version
    size: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    // Crucial for listing folder contents (both files & folders together)
    .index('by_parent', ['userId', 'parentId'])
    .index('by_type', ['userId', 'type'])
    .index('by_user_recents', ['userId', 'lastOpened'])
    .index('by_name', ['userId', 'name'])
    .searchIndex('search_name', {
      searchField: 'name',
      filterFields: ['userId'],
    }),

  // --- S3 Version Control ---
  fileVersions: defineTable({
    fileId: v.id('driveItems'),
    userId: v.string(), // Add this!
    size: v.number(),
    storageKey: v.string(),
    thumbnailUrl: v.optional(v.string()),
    versionId: v.string(),
    createdAt: v.number(),
    isDeleted: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_file', ['fileId']),

  // --- Public Sharing Logic ---
  publicLinks: defineTable({
    fileId: v.id('driveItems'),
    versionId: v.optional(v.string()), // Can share specific version or 'latest'
    token: v.string(), // Unique string for the URL: /share/[token]
    expiresAt: v.optional(v.number()), // Null = Lifetime access
  }).index('by_token', ['token']),

  // --- Trigger / Rule Engine ---
  folderRules: defineTable({
    folderId: v.id('driveItems'),
    isActive: v.boolean(),
    userId: v.string(),
    triggerType: v.literal('file_upload'),
  }).index('by_folderId', ['folderId', 'isActive']),

  folderRuleFlows: defineTable({
    ruleId: v.id('folderRules'),
    userId: v.string(),
    filter: v.object({
      field: v.string(), // 'media_type'
      operator: v.string(), // 'eq'
      value: v.string(), // 'video'
    }),

    actions: v.array(
      v.object({
        type: v.string(),
        extraData: v.optional(v.string()),
      }),
    ),
  }).index('by_ruleId', ['ruleId']),

  // --- Task Tracking (RabbitMQ Feedback) ---
  tasks: defineTable({
    fileId: v.id('driveItems'),
    type: v.string(), // "remove_bg", "upload"
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    priority: v.number(), // 1-10
    error: v.optional(v.string()),
  }).index('by_file', ['fileId']),
})
