import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageContainer } from './PageContainer';

describe('PageContainer', () => {
  it('renders with title and children', () => {
    render(
      <PageContainer title="Test Page">
        <div>Test content</div>
      </PageContainer>
    );

    expect(screen.getByText('Test Page')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders without actions when not provided', () => {
    const { container } = render(
      <PageContainer title="Test Page">
        <div>Content</div>
      </PageContainer>
    );

    const actionsDiv = container.querySelector('[class*="actions"]');
    expect(actionsDiv).not.toBeInTheDocument();
  });

  it('renders with actions when provided', () => {
    render(
      <PageContainer
        title="Test Page"
        actions={
          <button>Action Button</button>
        }
      >
        <div>Content</div>
      </PageContainer>
    );

    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });

  it('renders multiple action elements', () => {
    render(
      <PageContainer
        title="Test Page"
        actions={
          <>
            <button>Action 1</button>
            <button>Action 2</button>
            <button>Action 3</button>
          </>
        }
      >
        <div>Content</div>
      </PageContainer>
    );

    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
    expect(screen.getByText('Action 3')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <PageContainer title="Test Page" className="custom-class">
        <div>Content</div>
      </PageContainer>
    );

    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv.className).toContain('custom-class');
  });

  it('renders complex children content', () => {
    render(
      <PageContainer title="Complex Page">
        <div>
          <h2>Section Title</h2>
          <p>Paragraph content</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      </PageContainer>
    );

    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('has proper structure with header and content areas', () => {
    const { container } = render(
      <PageContainer title="Test Page">
        <div>Content</div>
      </PageContainer>
    );

    const header = container.querySelector('[class*="header"]');
    const content = container.querySelector('[class*="content"]');

    expect(header).toBeInTheDocument();
    expect(content).toBeInTheDocument();
  });

  it('renders title as h1 element', () => {
    render(
      <PageContainer title="Page Title">
        <div>Content</div>
      </PageContainer>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Page Title');
  });

  it('handles empty string title', () => {
    render(
      <PageContainer title="">
        <div>Content</div>
      </PageContainer>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('');
  });

  it('handles long title text', () => {
    const longTitle = 'This is a very long page title that might wrap to multiple lines on smaller screens';
    render(
      <PageContainer title={longTitle}>
        <div>Content</div>
      </PageContainer>
    );

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });
});
