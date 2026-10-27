"use client"

import * as React from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeOffIcon,
  GripVerticalIcon,
  Maximize2Icon,
  Minimize2Icon,
  PlusIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useFormatters } from "@/components/lang-provider"
import {
  ChecksWidget,
  RecentWidget,
} from "@/components/overview/activity-widgets"
import {
  ExpensesWidget,
  SalesWidget,
} from "@/components/overview/breakdown-widgets"
import { MonthsWidget } from "@/components/overview/months-widget"
import { ResultWidget } from "@/components/overview/result-widget"
import { VatWidget } from "@/components/overview/vat-widget"
import {
  moveWidget,
  normalizeLayout,
  stepWidget,
  type OverviewWidget,
  type OverviewWidgetId,
} from "@/lib/domain/overview-layout"
import type { MessageKey } from "@/lib/i18n/messages"
import { cn } from "@/lib/utils"
import { useBookStore } from "@/stores/book-store"

const WIDGETS: Record<
  OverviewWidgetId,
  { title: MessageKey; Component: React.ComponentType; tall?: boolean }
> = {
  result: { title: "overview.widgetResult", Component: ResultWidget },
  vat: { title: "overview.widgetVat", Component: VatWidget },
  months: {
    title: "overview.widgetMonths",
    Component: MonthsWidget,
    tall: true,
  },
  sales: { title: "overview.widgetSales", Component: SalesWidget },
  expenses: { title: "overview.widgetExpenses", Component: ExpensesWidget },
  recent: { title: "overview.widgetRecent", Component: RecentWidget },
  checks: { title: "overview.widgetChecks", Component: ChecksWidget },
}

/**
 * The overview's widgets on a three-column grid (§8.12). `grid-flow-dense`
 * lets a narrow widget fill the hole a wide one leaves, so a rearranged board
 * still packs tightly. Below 1100 px it is one column and size is ignored.
 *
 * In edit mode each widget gets a toolbar: a drag handle, arrows to move it
 * among the visible ones, a size toggle and hide. Its contents go inert,
 * so a drag never opens an entry. The arrows and the handle's keyboard mode
 * are two routes to the same place; neither needs a pointer.
 */
export function OverviewBoard({ editing }: { editing: boolean }) {
  const f = useFormatters()
  const stored = useBookStore((s) => s.overviewLayout)
  const setLayout = useBookStore((s) => s.setOverviewLayout)
  const layout = React.useMemo(() => normalizeLayout(stored), [stored])
  const visible = layout.filter((w) => !w.hidden)
  const hidden = layout.filter((w) => w.hidden)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const title = (id: unknown) =>
    WIDGETS[id as OverviewWidgetId]
      ? f.t(WIDGETS[id as OverviewWidgetId].title)
      : ""

  const update = (next: OverviewWidget[]) => setLayout(next)
  const patch = (id: OverviewWidgetId, change: Partial<OverviewWidget>) =>
    update(layout.map((w) => (w.id === id ? { ...w, ...change } : w)))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      update(
        moveWidget(
          layout,
          active.id as OverviewWidgetId,
          over.id as OverviewWidgetId
        )
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {editing ? (
        <p className="text-sm text-muted-foreground">
          {f.t("overview.editHint")}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: f.t("overview.dndInstructions"),
          },
          announcements: {
            onDragStart: ({ active }) =>
              f.t("overview.dndPicked", { w: title(active.id) }),
            onDragOver: ({ active, over }) =>
              over
                ? f.t("overview.dndOver", {
                    w: title(active.id),
                    o: title(over.id),
                  })
                : undefined,
            onDragEnd: ({ active }) =>
              f.t("overview.dndDropped", { w: title(active.id) }),
            onDragCancel: () => f.t("overview.dndCancelled"),
          },
        }}
      >
        <SortableContext
          items={visible.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-flow-row-dense gap-4 min-[1100px]:grid-cols-3">
            {visible.map((w, i) => (
              <SortableWidget
                key={w.id}
                widget={w}
                editing={editing}
                first={i === 0}
                last={i === visible.length - 1}
                onStep={(dir) => update(stepWidget(layout, w.id, dir))}
                onToggleSize={() =>
                  patch(w.id, { size: w.size === "L" ? "S" : "L" })
                }
                onHide={() => patch(w.id, { hidden: true })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!visible.length && !editing ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {f.t("overview.allHidden")}
        </p>
      ) : null}

      {editing && hidden.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
          <span className="mr-1 text-sm text-muted-foreground">
            {f.t("overview.hidden")}
          </span>
          {hidden.map((w) => (
            <Button
              key={w.id}
              variant="outline"
              size="sm"
              aria-label={f.t("overview.show", { w: title(w.id) })}
              onClick={() => patch(w.id, { hidden: false })}
            >
              <PlusIcon data-icon="inline-start" />
              {title(w.id)}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SortableWidget({
  widget,
  editing,
  first,
  last,
  onStep,
  onToggleSize,
  onHide,
}: {
  widget: OverviewWidget
  editing: boolean
  first: boolean
  last: boolean
  onStep: (dir: -1 | 1) => void
  onToggleSize: () => void
  onHide: () => void
}) {
  const f = useFormatters()
  const { title, Component, tall } = WIDGETS[widget.id]
  const name = f.t(title)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !editing,
    attributes: { roleDescription: f.t("overview.dndRole") },
  })
  const wide = widget.size === "L"

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "@container relative flex min-w-0",
        wide && "min-[1100px]:col-span-2",
        wide && tall && "min-[1100px]:row-span-2",
        isDragging && "z-10 opacity-80"
      )}
    >
      {editing ? (
        <div
          role="toolbar"
          aria-label={name}
          className="absolute top-2 right-2 z-10 flex gap-0.5 rounded-md border bg-popover p-0.5 shadow-md"
        >
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon-sm"
            className="cursor-grab touch-none active:cursor-grabbing"
            aria-label={f.t("overview.drag", { w: name })}
            title={f.t("overview.drag", { w: name })}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={first}
            aria-label={f.t("overview.moveEarlier")}
            title={f.t("overview.moveEarlier")}
            onClick={() => onStep(-1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={last}
            aria-label={f.t("overview.moveLater")}
            title={f.t("overview.moveLater")}
            onClick={() => onStep(1)}
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden min-[1100px]:inline-flex"
            aria-label={f.t(wide ? "overview.narrow" : "overview.widen")}
            title={f.t(wide ? "overview.narrow" : "overview.widen")}
            onClick={onToggleSize}
          >
            {wide ? <Minimize2Icon /> : <Maximize2Icon />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={f.t("overview.hide")}
            title={f.t("overview.hide")}
            onClick={onHide}
          >
            <EyeOffIcon />
          </Button>
        </div>
      ) : null}

      <div
        inert={editing}
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          editing &&
            "rounded-lg opacity-80 outline-1 outline-offset-4 outline-input outline-dashed"
        )}
      >
        <Component />
      </div>
    </div>
  )
}
