import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/**
 * Example usage of the Sidebar component
 * 
 * This demonstrates how to integrate the Sidebar with React Router
 * in the LikenessGuard Dashboard.
 */
export const SidebarExample: React.FC = () => {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh' }}>
        <Sidebar />
        
        <main style={{ 
          flex: 1, 
          marginLeft: '280px', 
          padding: '2rem',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}>
          <h1>Sidebar Example</h1>
          <p>Click navigation items in the sidebar to navigate between pages.</p>
          <p>Resize the browser window to see responsive behavior:</p>
          <ul>
            <li>Desktop (1024px): Full sidebar</li>
            <li>Tablet (768px-1023px): Narrower sidebar</li>
            <li>Mobile (&lt;768px): Hamburger menu</li>
          </ul>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default SidebarExample;