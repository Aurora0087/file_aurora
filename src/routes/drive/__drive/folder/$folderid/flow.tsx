import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  getOutgoers,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { createFileRoute } from '@tanstack/react-router'
import {
  IconDeviceFloppy,
  IconPlus,
  IconEye,
  IconLoader2,
  IconFolderFilled,
  IconTrash,
} from '@tabler/icons-react'

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import TriggerNode from '@/components/drive/folder/flow/Trigger-node'
import ActionNode from '@/components/drive/folder/flow/ActionNode'
import FilterNode from '@/components/drive/folder/flow/FilterNode'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/Switch'
import { useMutation, useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Id } from 'convex/_generated/dataModel'
import FlowErrorComponent from '@/components/drive/folder/flow/Flow-error'
import BackButton from '@/components/BackButton'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const nodeTypes = {
  trigger: TriggerNode,
  filter: FilterNode,
  action: ActionNode,
}

export const Route = createFileRoute('/drive/__drive/folder/$folderid/flow')({
  component: RouteComponent,
  errorComponent: FlowErrorComponent,
})

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Upload' },
  },
]

const initialEdges: Edge[] = []

function RouteComponent() {
  const { folderid } = Route.useParams()
  const [isEnabled, setIsEnabled] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [jsonPreview, setJsonPreview] = useState<any>(null)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Mutations
  const create = useMutation(api.drive.createFlow)
  const update = useMutation(api.drive.updateFlow)
  const removeFlow = useMutation(api.drive.deleteFlow)

  // Query (flowData will be undefined while loading)
  const flowData = useQuery(api.drive.getFlow, {
    folderId: folderid as Id<'driveItems'>,
  })

  const onNodeDataChange = (nodeId: string, key: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, [key]: value } }
        }
        return node
      }),
    )
  }

  const onConnect = useCallback(
    (params: any) => {
      const sourceNode = nodes.find((n) => n.id === params.source)
      const targetNode = nodes.find((n) => n.id === params.target)

      if (sourceNode?.type === 'trigger' && targetNode?.type === 'action') {
        toast.warning('Please add a filter before the action!')
        return
      }
      if (sourceNode?.type === 'filter' && targetNode?.type === 'filter') {
        toast.warning("Can't connect Filters together!")
        return
      }
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { strokeWidth: 2 } }, eds),
      )
    },
    [nodes, setEdges],
  )

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id))
    setEdges((eds) =>
      eds.filter((edge) => edge.source !== id && edge.target !== id),
    )
    toast.error('Node removed')
  }, [])

  const generateFlowJson = () => {
    const triggerNode = nodes.find((n) => n.type === 'trigger')
    if (!triggerNode) return null

    const connectedFilters = getOutgoers(triggerNode, nodes, edges).filter(
      (n) => n.type === 'filter',
    )

    const flows = connectedFilters.map((filterNode) => {
      const flowActions: any[] = []
      let currentIndex = 0

      const findActions = (currentNode: Node) => {
        const outgoers = getOutgoers(currentNode, nodes, edges).filter(
          (n) => n.type === 'action',
        )
        outgoers.forEach((actionNode) => {
          flowActions.push({
            index: currentIndex++,
            type: actionNode.data.action,
            targetFolder: actionNode.data.targetFolder,
            targetFolderName: actionNode.data.targetFolderName, // Included
            quality: actionNode.data.quality,
            format: actionNode.data.format,
          })
          findActions(actionNode)
        })
      }

      findActions(filterNode)

      return {
        filter: {
          field: filterNode.data.field,
          operator: filterNode.data.operator,
          value: filterNode.data.value,
        },
        actions: flowActions,
      }
    })

    const result = {
      folderRules: [{ type: 'file_upload', folderId: folderid, flows }],
    }

    setJsonPreview(result)
    return result
  }

  const handleSave = async () => {
    const generated = generateFlowJson()
    if (!generated || !generated.folderRules[0].flows.length) {
      toast.error('No valid flow detected. Connect a Trigger to a Filter.')
      return
    }

    const payload = {
      isActive: isEnabled,
      triggerType: 'file_upload' as const,
      flows: generated.folderRules[0].flows.map((f: any) => ({
        filter: f.filter,
        actions: f.actions.map((a: any) => ({
          type: a.type,
          extraData: JSON.stringify({
            targetFolder: a.targetFolder,
            targetFolderName: a.targetFolderName,
            quality: a.quality,
            format: a.format,
          }),
        })),
      })),
    }

    try {
      if (flowData?.rule) {
        // UPDATE EXISTING
        await update({ ruleId: flowData.rule.ruleId, ...payload })
        toast.success('Workflow updated successfully')
      } else {
        // CREATE NEW
        await create({ folderId: folderid as Id<'driveItems'>, ...payload })
        toast.success('Workflow created successfully')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to save workflow')
    }
  }

  const handleDeleteFlow = async () => {
    setIsDeleting(true)
    try {
      await removeFlow({ folderId: folderid as Id<'driveItems'> })
      toast.success('Automation flow deleted')
      setShowDeleteDialog(false)

      // Optional: Reset the view if needed, though getFlow query
      // should automatically update to rule: null
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete flow')
    } finally {
      setIsDeleting(false)
    }
  }

  // Effect to load nodes from database
  useEffect(() => {
    // 1. If we have a rule, load the nodes and edges from the DB
    if (flowData?.rule) {
      setIsEnabled(flowData.rule.isActive)
      const newNodes: Node[] = [
        {
          id: '1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: { label: 'Upload' },
        },
      ]
      const newEdges: Edge[] = []

      flowData.rule.flows.forEach((flow, index) => {
        const filterId = `filter_${flow.id}`
        newNodes.push({
          id: filterId,
          type: 'filter',
          position: { x: 100, y: 250 + index * 250 },
          data: {
            ...flow.filter,
            onChange: onNodeDataChange,
            onDelete: onDeleteNode,
          },
        })
        newEdges.push({
          id: `e1-${filterId}`,
          source: '1',
          target: filterId,
          animated: true,
        })

        flow.actions.forEach((action, aIndex) => {
          const actionId = `action_${flow.id}_${aIndex}`
          newNodes.push({
            id: actionId,
            type: 'action',
            position: { x: 450, y: 250 + index * 250 + aIndex * 150 },
            data: {
              action: action.type,
              ...action.settings,
              onChange: onNodeDataChange,
              onDelete: onDeleteNode,
            },
          })
          const sourceId =
            aIndex === 0 ? filterId : `action_${flow.id}_${aIndex - 1}`
          newEdges.push({
            id: `e-${sourceId}-${actionId}`,
            source: sourceId,
            target: actionId,
            animated: true,
          })
        })
      })

      setNodes(newNodes)
      setEdges(newEdges)
    }
    // 2. If data finished loading but NO rule exists (e.g. after deletion)
    else if (flowData && !flowData.rule) {
      setNodes(initialNodes) // Resets to just the Trigger node
      setEdges([]) // Clears all connection lines
      setIsEnabled(true) // Resets switch to default
    }
  }, [flowData])

  const addFilter = () => {
    const id = `filter_${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'filter',
        position: { x: 100, y: 250 },
        data: {
          field: 'extension',
          operator: 'eq',
          value: 'image',
          onChange: onNodeDataChange,
          onDelete: onDeleteNode,
        },
      },
    ])
  }

  const addAction = () => {
    const id = `action_${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'action',
        position: { x: 400, y: 450 },
        data: {
          action: 'compress',
          onChange: onNodeDataChange,
          onDelete: onDeleteNode,
        },
      },
    ])
  }

  // --- LOADING STATE UI ---
  if (flowData === undefined) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-background">
        <IconLoader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
          Loading workflow configuration...
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between gap-4 pb-2 border-b">
        <BackButton className=" w-fit" />
        <div className=" flex gap-2 items-center">
          <IconFolderFilled style={{ color: flowData?.color }} />
          <h1 className="text-lg font-bold uppercase tracking-tight w-fit">
            {flowData?.folderName} Flow Designer
          </h1>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={!flowData?.rule?.ruleId || isDeleting}
          onClick={() => setShowDeleteDialog(true)}
        >
          <IconTrash size={16} className="mr-2" />
          Delete Flow
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all filters and actions configured
              for this folder. Files will no longer be automatically processed
              when uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault() // Prevent closing until mutation finishes
                handleDeleteFlow()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <IconLoader2 className="animate-spin mr-2" size={16} />
              ) : (
                <IconTrash size={16} className="mr-2" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-2 items-center justify-between py-2 bg-background border-b z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
            <Switch
              id="flow-mode"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
            <Label
              htmlFor="flow-mode"
              className="text-xs font-bold cursor-pointer"
            >
              {isEnabled ? 'FLOW ENABLED' : 'FLOW DISABLED'}
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addFilter}
            disabled={!isEnabled}
          >
            <IconPlus size={16} className="mr-1" /> Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addAction}
            disabled={!isEnabled}
          >
            <IconPlus size={16} className="mr-1" /> Action
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              generateFlowJson()
              setIsPreviewOpen(true)
            }}
          >
            <IconEye size={16} className="mr-2" /> Preview JSON
          </Button>
          <Button size="sm" onClick={handleSave}>
            <IconDeviceFloppy size={16} className="mr-2" />{' '}
            {flowData?.rule ? 'Update Changes' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div
        className={`flex-1 w-full relative transition-all duration-500 ${!isEnabled ? 'grayscale opacity-50' : ''}`}
      >
        <ReactFlow
          colorMode="dark"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          nodesConnectable={isEnabled}
          nodesDraggable={isEnabled}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
        {!isEnabled && (
          <div className="absolute inset-0 bg-background/20 z-10 flex items-center justify-center">
            <div className="bg-card p-4 rounded-lg border shadow-2xl text-center">
              <p className="text-sm font-bold">Automation Paused</p>
              <p className="text-xs text-muted-foreground">
                Enable the flow to make edits
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Preview Drawer */}
      <Drawer open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-3xl px-6 pb-10">
            <DrawerHeader>
              <DrawerTitle>Workflow Configuration Preview</DrawerTitle>
              <DrawerDescription>
                Logic structure for the server execution engine.
              </DrawerDescription>
            </DrawerHeader>
            <div className="mt-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs overflow-auto max-h-[50vh]">
              <pre className="text-emerald-400">
                {JSON.stringify(jsonPreview, null, 2)}
              </pre>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(jsonPreview, null, 2),
                  )
                  toast.success('Copied')
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
