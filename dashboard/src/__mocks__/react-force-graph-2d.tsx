/**
 * Mock for react-force-graph-2d
 * Used in tests to avoid rendering the actual force graph
 */

import React from 'react';

const ForceGraph2D = (props: any) => {
  return <div data-testid="force-graph-mock" />;
};

export default ForceGraph2D;