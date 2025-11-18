

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

const Header = React.forwardRef<
  HTMLElement,
  React.ComponentProps<"header"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "header"

  return (
    <Comp
      ref={ref}
      className={cn(
        "sticky top-0 z-10 w-full border-b bg-background shadow-sm",
        className
      )}
      {...props}
    />
  )
})
Header.displayName = "Header"

const HeaderContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex w-full items-center gap-2 px-4 py-2", className)}
      {...props}
    />
  )
})
HeaderContent.displayName = "HeaderContent"

const HeaderBrand = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      className={cn("flex-1", "lg:flex-none", className)}
      {...props}
    />
  )
})
HeaderBrand.displayName = "HeaderBrand"

const HeaderActions = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"

  return (
    <Comp
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
})
HeaderActions.displayName = "HeaderActions"

export { Header, HeaderActions, HeaderBrand, HeaderContent }
