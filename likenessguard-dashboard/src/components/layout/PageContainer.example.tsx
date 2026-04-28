import React from 'react';
import { PageContainer } from './PageContainer';
import { Button } from '../common/Button';

/**
 * Example usage of PageContainer component
 * 
 * This file demonstrates how to use the PageContainer layout component
 * in different scenarios.
 */

// Example 1: Basic page with title and content
export const BasicPageExample: React.FC = () => {
  return (
    <PageContainer title="Dashboard Home">
      <div>
        <p>Welcome to LikenessGuard Dashboard</p>
        <p>Your likeness protection status and recent activity will appear here.</p>
      </div>
    </PageContainer>
  );
};

// Example 2: Page with quick actions
export const PageWithActionsExample: React.FC = () => {
  return (
    <PageContainer
      title="Registration"
      actions={
        <>
          <Button variant="secondary" onClick={() => console.log('Cancel')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => console.log('Submit')}>
            Submit
          </Button>
        </>
      }
    >
      <div>
        <p>Upload your photos to register your likeness.</p>
        {/* Registration form would go here */}
      </div>
    </PageContainer>
  );
};

// Example 3: Page with single action button
export const PageWithSingleActionExample: React.FC = () => {
  return (
    <PageContainer
      title="Activity Logs"
      actions={
        <Button variant="primary" onClick={() => console.log('Refresh')}>
          Refresh
        </Button>
      }
    >
      <div>
        <p>View your consent check history and activity logs.</p>
        {/* Logs table would go here */}
      </div>
    </PageContainer>
  );
};

// Example 4: Page with complex content
export const PageWithComplexContentExample: React.FC = () => {
  return (
    <PageContainer
      title="Consent Policy"
      actions={
        <>
          <Button variant="danger" onClick={() => console.log('Revoke')}>
            Revoke Consent
          </Button>
          <Button variant="primary" onClick={() => console.log('Save')}>
            Save Changes
          </Button>
        </>
      }
    >
      <div>
        <section style={{ marginBottom: '24px' }}>
          <h2>Policy Settings</h2>
          <p>Configure how your likeness can be used.</p>
        </section>
        
        <section style={{ marginBottom: '24px' }}>
          <h3>Commercial Use</h3>
          <p>Allow your likeness to be used for commercial purposes.</p>
          {/* Toggle would go here */}
        </section>
        
        <section>
          <h3>Editorial Use</h3>
          <p>Allow your likeness to be used for editorial purposes.</p>
          {/* Toggle would go here */}
        </section>
      </div>
    </PageContainer>
  );
};

// Example 5: Page with custom className
export const PageWithCustomClassExample: React.FC = () => {
  return (
    <PageContainer
      title="Violations"
      className="violations-page"
    >
      <div>
        <p>No violations detected. Your likeness is protected.</p>
      </div>
    </PageContainer>
  );
};
