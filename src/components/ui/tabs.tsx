'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type TabsContextValue = {
  value: string
  setValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used inside <Tabs>')
  }

  return context
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string
  defaultValue: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const resolvedValue = value ?? internalValue

  const contextValue = React.useMemo<TabsContextValue>(
    () => ({
      value: resolvedValue,
      setValue(nextValue) {
        if (value === undefined) {
          setInternalValue(nextValue)
        }
        onValueChange?.(nextValue)
      },
    }),
    [onValueChange, resolvedValue, value],
  )

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={className} {...props} />
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'button'> & { value: string }) {
  const { value: currentValue, setValue } = useTabsContext()
  const isActive = currentValue === value

  return (
    <button
      type="button"
      data-state={isActive ? 'active' : 'inactive'}
      className={cn(className)}
      onClick={() => setValue(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { value: string }) {
  const { value: currentValue } = useTabsContext()

  if (currentValue !== value) {
    return null
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}
