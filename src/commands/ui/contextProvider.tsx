import React, { createContext, Component, ReactNode } from 'react';

// Create a context with a default theme
const ThemeContext = createContext<string>('light');

// Define a provider component that will wrap your application
class ThemeProvider extends Component<{ children: ReactNode; theme: string }> {
  render() {
    const { children, theme } = this.props;

    return (
      <ThemeContext.Provider value={theme}>
        {children}
      </ThemeContext.Provider>
    );
  }
}

export { ThemeProvider,ThemeContext };



