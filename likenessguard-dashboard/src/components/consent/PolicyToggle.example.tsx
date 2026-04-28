import React, { useState } from 'react';
import { PolicyToggle } from './PolicyToggle';

/**
 * Example usage of the PolicyToggle component
 * 
 * This demonstrates the PolicyToggle component with various configurations:
 * - Basic toggle with label
 * - Toggle with description
 * - Disabled toggle
 * - Multiple toggles for a policy form
 */
export const PolicyToggleExample: React.FC = () => {
  const [allowCommercial, setAllowCommercial] = useState(false);
  const [allowEditorial, setAllowEditorial] = useState(true);
  const [allowResearch, setAllowResearch] = useState(true);
  const [disabledOption, setDisabledOption] = useState(false);

  return (
    <div style={{ padding: '24px', backgroundColor: '#0B1224', minHeight: '100vh' }}>
      <h1 style={{ color: '#E6ECF5', marginBottom: '32px' }}>PolicyToggle Examples</h1>

      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ color: '#A9B4C8', fontSize: '1.125rem', marginBottom: '8px' }}>
          Basic Toggle
        </h2>
        <PolicyToggle
          label="Allow Commercial Use"
          value={allowCommercial}
          onChange={setAllowCommercial}
        />

        <h2 style={{ color: '#A9B4C8', fontSize: '1.125rem', marginTop: '24px', marginBottom: '8px' }}>
          Toggle with Description
        </h2>
        <PolicyToggle
          label="Allow Editorial Use"
          value={allowEditorial}
          onChange={setAllowEditorial}
          description="Permit use of your likeness in news articles, documentaries, and editorial content."
        />

        <PolicyToggle
          label="Allow Research Use"
          value={allowResearch}
          onChange={setAllowResearch}
          description="Allow your likeness to be used for academic research and AI model training purposes."
        />

        <h2 style={{ color: '#A9B4C8', fontSize: '1.125rem', marginTop: '24px', marginBottom: '8px' }}>
          Disabled Toggle
        </h2>
        <PolicyToggle
          label="Disabled Option"
          value={disabledOption}
          onChange={setDisabledOption}
          description="This toggle is disabled and cannot be changed."
          disabled={true}
        />

        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#0E1A2F', borderRadius: '8px' }}>
          <h3 style={{ color: '#E6ECF5', marginBottom: '12px' }}>Current State:</h3>
          <pre style={{ color: '#A9B4C8', fontSize: '0.875rem' }}>
            {JSON.stringify({
              allowCommercial,
              allowEditorial,
              allowResearch,
              disabledOption,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
