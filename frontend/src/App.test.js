import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the flashcard app home screen', () => {
  render(<App />);
  expect(screen.getByText(/flashcard generator/i)).toBeInTheDocument();
  expect(screen.getByText(/get started/i)).toBeInTheDocument();
});
