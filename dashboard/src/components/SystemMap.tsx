/**
 * SystemMap Component
 * 
 * Visualizes the network of connections between customer systems, AI services, and data sources
 * using a simple SVG-based radial layout with cyberpunk styling.
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import React, { useMemo } from 'react';
import { LogEntry } from '../types';
import { theme } from '../styles/theme';
import './SystemMap.css';

interface Node {
  id: string;
  type: 'system' | 'ai_service' | 'data_source';
  label: string;
  x: number;
  y: number;
}

interface Edge {
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SystemMapProps {
  logs: LogEntry[];
}

export const SystemMap: React.FC<SystemMapProps> = ({ logs }) => {
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Omit<Node, 'x' | 'y'>>();
    const edgeSet = new Set<string>();

    // Add central system node
    nodeMap.set('system', {
      id: 'system',
      type: 'system',
      label: 'Customer System'
    });

    // Extract AI services and data sources from logs
    logs.forEach(log => {
      if (log.ai_service) {
        nodeMap.set(log.ai_service, {
          id: log.ai_service,
          type: 'ai_service',
          label: log.ai_service
        });
        edgeSet.add('system->' + log.ai_service);
      }

      if (log.data_sources && Array.isArray(log.data_sources)) {
        log.data_sources.forEach(ds => {
          if (ds) {
            nodeMap.set(ds, {
              id: ds,
              type: 'data_source',
              label: ds
            });
            if (log.ai_service) {
              edgeSet.add(log.ai_service + '->' + ds);
            }
          }
        });
      }
    });

    // Layout configuration
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const aiServiceRadius = 120;
    const dataSourceRadius = 220;

    // Position nodes
    const positionedNodes: Node[] = [];
    const aiServices: Node[] = [];
    const dataSources: Node[] = [];

    nodeMap.forEach((node) => {
      if (node.type === 'system') {
        positionedNodes.push({ ...node, x: centerX, y: centerY });
      } else if (node.type === 'ai_service') {
        aiServices.push({ ...node, x: 0, y: 0 });
      } else if (node.type === 'data_source') {
        dataSources.push({ ...node, x: 0, y: 0 });
      }
    });

    // Position AI services in a circle around the center
    aiServices.forEach((node, i) => {
      const angle = (i / aiServices.length) * 2 * Math.PI - Math.PI / 2;
      node.x = centerX + Math.cos(angle) * aiServiceRadius;
      node.y = centerY + Math.sin(angle) * aiServiceRadius;
      positionedNodes.push(node);
    });

    // Position data sources in an outer circle
    dataSources.forEach((node, i) => {
      const angle = (i / dataSources.length) * 2 * Math.PI - Math.PI / 2;
      node.x = centerX + Math.cos(angle) * dataSourceRadius;
      node.y = centerY + Math.sin(angle) * dataSourceRadius;
      positionedNodes.push(node);
    });

    // Create positioned edges
    const positionedEdges: Edge[] = Array.from(edgeSet).map(edgeKey => {
      const [sourceId, targetId] = edgeKey.split('->');
      const sourceNode = positionedNodes.find(n => n.id === sourceId);
      const targetNode = positionedNodes.find(n => n.id === targetId);
      
      return {
        source: sourceId,
        target: targetId,
        x1: sourceNode?.x || 0,
        y1: sourceNode?.y || 0,
        x2: targetNode?.x || 0,
        y2: targetNode?.y || 0
      };
    });

    return { nodes: positionedNodes, edges: positionedEdges };
  }, [logs]);

  const getNodeColor = (type: Node['type']): string => {
    switch (type) {
      case 'system':
        return theme.colors.accent.cyan;
      case 'ai_service':
        return theme.colors.accent.magenta;
      case 'data_source':
        return theme.colors.accent.green;
      default:
        return theme.colors.text.secondary;
    }
  };

  return (
    <div 
      className="system-map-container"
      style={{
        width: '100%',
        height: '500px',
        background: theme.effects.glassMorphism.background,
        border: theme.effects.glassMorphism.border
      }}
    >
      <svg width="100%" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.colors.accent.cyan} stopOpacity="0.3" />
            <stop offset="100%" stopColor={theme.colors.accent.cyan} stopOpacity="0.1" />
          </linearGradient>
          
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill={theme.colors.accent.cyan}
              opacity="0.5"
            />
          </marker>
        </defs>

        <g className="edges">
          {edges.map((edge, i) => (
            <line
              key={`edge-${i}`}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="url(#linkGradient)"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              className="edge-line"
            />
          ))}
        </g>

        <g className="nodes">
          {nodes.map((node) => (
            <g key={node.id} className="node-group">
              <circle
                cx={node.x}
                cy={node.y}
                r={node.type === 'system' ? 28 : 20}
                fill={getNodeColor(node.type)}
                opacity="0.2"
                style={{ filter: 'blur(8px)' }}
              />
              
              <circle
                cx={node.x}
                cy={node.y}
                r={node.type === 'system' ? 20 : 14}
                fill={theme.colors.background.secondary}
                stroke={getNodeColor(node.type)}
                strokeWidth="2"
                className="node-circle"
              />
              
              <text
                x={node.x}
                y={node.y + (node.type === 'system' ? 40 : 32)}
                textAnchor="middle"
                fill={getNodeColor(node.type)}
                fontSize={node.type === 'system' ? '14' : '11'}
                fontWeight={node.type === 'system' ? 'bold' : 'normal'}
                className="node-label"
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default SystemMap;
