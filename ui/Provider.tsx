import React from 'react'
import { ThemeProvider, StylesProvider } from '@material-ui/core/styles'
import { theme } from './theme'

export const UIProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <StylesProvider injectFirst>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </StylesProvider>
  )
}
