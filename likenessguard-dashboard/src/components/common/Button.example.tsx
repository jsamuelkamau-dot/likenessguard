/**
 * Button Component Usage Examples
 * 
 * This file demonstrates how to use the Button component with different variants and states.
 */

import React, { useState } from 'react';
import { Button } from './Button';

export const ButtonExamples: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleAsyncAction = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Action completed!');
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section>
        <h2>Button Variants</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => alert('Primary clicked!')}>
            Primary Button
          </Button>
          <Button variant="secondary" onClick={() => alert('Secondary clicked!')}>
            Secondary Button
          </Button>
          <Button variant="danger" onClick={() => alert('Danger clicked!')}>
            Danger Button
          </Button>
        </div>
      </section>

      <section>
        <h2>Loading State</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" loading>
            Loading Primary
          </Button>
          <Button variant="secondary" loading>
            Loading Secondary
          </Button>
          <Button variant="danger" loading>
            Loading Danger
          </Button>
        </div>
      </section>

      <section>
        <h2>Disabled State</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" disabled>
            Disabled Primary
          </Button>
          <Button variant="secondary" disabled>
            Disabled Secondary
          </Button>
          <Button variant="danger" disabled>
            Disabled Danger
          </Button>
        </div>
      </section>

      <section>
        <h2>Interactive Example</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={handleAsyncAction} loading={loading}>
            {loading ? 'Processing...' : 'Start Async Action'}
          </Button>
        </div>
      </section>

      <section>
        <h2>Button Types</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert('Form submitted!');
          }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}
        >
          <Button type="submit" variant="primary">
            Submit Form
          </Button>
          <Button type="reset" variant="secondary">
            Reset Form
          </Button>
          <Button type="button" variant="danger" onClick={() => alert('Cancel clicked!')}>
            Cancel
          </Button>
        </form>
      </section>
    </div>
  );
};
