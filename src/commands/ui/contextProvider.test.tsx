import React from 'react';
import { render, screen } from '@testing-library/react';
import
 { ThemeProvider, ThemeContext } from '../index';

describe('ThemeProvider', () => {
  test('renders children with provided theme', () => {
    const TestComponent = () => {
      const theme = React.useContext(ThemeContext);
      return <div data-testid="test-component">{theme}</div>;
    };

    const theme = 'dark';
    render(
      <ThemeProvider theme={theme}>
        <TestComponent />
      </ThemeProvider>
    );

    const testComponent = screen.getByTestId('test-component');
    expect(testComponent.textContent).toBe(theme);
  });
});