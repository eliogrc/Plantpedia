import { useEffect } from 'react'
import ReactDOM from 'react-dom'
export { ServerStyleSheets } from '@material-ui/core/styles'

// Material UI v4 calls `ReactDOM.findDOMNode(buttonRef.current)` where
// `buttonRef.current` is already a DOM Element. React 18.3+ logs a deprecation
// warning on every `findDOMNode` call even when passed a raw DOM Element, so
// short-circuiting DOM nodes avoids calling `findDOMNode` at all.
if (
  typeof window !== 'undefined' &&
  typeof (ReactDOM as any).findDOMNode === 'function'
) {
  const originalFindDOMNode = (ReactDOM as any).findDOMNode.bind(ReactDOM)
  ;(ReactDOM as any).findDOMNode = (instance: unknown) => {
    if (instance == null) {
      return null
    }
    if (instance instanceof Element || instance instanceof Text) {
      return instance
    }
    return originalFindDOMNode(instance)
  }
}

// @see: https://material-ui.com/styles/advanced/#next-js
export function useServerStyles() {
  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side')

    if (jssStyles) {
      jssStyles.remove()
    }
  }, [])
}
