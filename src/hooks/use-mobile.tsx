import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // matchMedia is unavailable in some test and embedded browser environments.
    if (typeof window.matchMedia !== "function") {
      update()
      window.addEventListener("resize", update)
      return () => window.removeEventListener("resize", update)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => update()
    mql.addEventListener("change", onChange)
    update()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
