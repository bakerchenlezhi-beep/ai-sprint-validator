"use client"

import { useSyncExternalStore } from "react"
import { cn } from "cn"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-white/10 bg-white/6 px-1 font-mono text-[11px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

const noopSubscribe = () => () => {}
const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Shortcut hint ("⌘↵" on Mac, "Ctrl ↵" elsewhere). Hidden from the accessible name of its button. */
function ModEnterKbd({ className }: { className?: string }) {
  const mac = useSyncExternalStore(noopSubscribe, isMac, () => false)
  return (
    <Kbd aria-hidden="true" className={className}>
      {mac ? "⌘↵" : "Ctrl ↵"}
    </Kbd>
  )
}

export { Kbd, ModEnterKbd }
