import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with children content', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render without title or actions', () => {
      const { container } = render(<Card>Content only</Card>);
      const header = container.querySelector('[class*="header"]');
      expect(header).not.toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<Card title="Test Title">Content</Card>);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render with actions', () => {
      render(
        <Card actions={<button>Action</button>}>
          Content
        </Card>
      );
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });

    it('should render with both title and actions', () => {
      render(
        <Card title="Title" actions={<button>Action</button>}>
          Content
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply card class', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is added', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card');
      expect(card.className).toContain('custom-class');
    });
  });

  describe('Header Structure', () => {
    it('should render header when title is provided', () => {
      const { container } = render(<Card title="Title">Content</Card>);
      const header = container.querySelector('[class*="header"]');
      expect(header).toBeInTheDocument();
    });

    it('should render header when actions are provided', () => {
      const { container } = render(
        <Card actions={<button>Action</button>}>Content</Card>
      );
      const header = container.querySelector('[class*="header"]');
      expect(header).toBeInTheDocument();
    });

    it('should render title as h3 element', () => {
      render(<Card title="Test Title">Content</Card>);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Test Title');
    });
  });

  describe('Content Structure', () => {
    it('should render content in content wrapper', () => {
      const { container } = render(<Card>Test Content</Card>);
      const content = container.querySelector('[class*="content"]');
      expect(content).toBeInTheDocument();
      expect(content).toHaveTextContent('Test Content');
    });

    it('should render complex children', () => {
      render(
        <Card>
          <div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </Card>
      );
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Theme Colors', () => {
    it('should apply card class with theme styling', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      // Card should have the card class which applies theme background colors
      expect(card.className).toContain('card');
    });
  });
});
