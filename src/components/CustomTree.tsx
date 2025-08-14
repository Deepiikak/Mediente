import React from 'react';
import { Box, Text, Badge, Group, ActionIcon, Collapse } from '@mantine/core';
import { IconChevronRight, IconChevronDown } from '@tabler/icons-react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  data?: any;
}

interface CustomTreeProps {
  data: TreeNode[];
  expanded: string[];
  onExpandedChange: (expanded: string[]) => void;
  onNodeClick?: (node: TreeNode) => void;
  nodeExpansionIcon?: React.ReactNode;
  nodeCollapseIcon?: React.ReactNode;
}

export function CustomTree({
  data,
  expanded,
  onExpandedChange,
  onNodeClick,
  nodeExpansionIcon = <IconChevronRight size={16} />,
  nodeCollapseIcon = <IconChevronDown size={16} />,
}: CustomTreeProps) {
  const toggleNode = (nodeId: string) => {
    const newExpanded = expanded.includes(nodeId)
      ? expanded.filter(id => id !== nodeId)
      : [...expanded, nodeId];
    onExpandedChange(newExpanded);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.includes(node.id);

    return (
      <Box key={node.id} ml={level * 20}>
        <Group
          gap="xs"
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          onClick={() => {
            if (hasChildren) {
              toggleNode(node.id);
            }
            onNodeClick?.(node);
          }}
        >
          {hasChildren && (
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? nodeCollapseIcon : nodeExpansionIcon}
            </ActionIcon>
          )}
          {!hasChildren && <Box style={{ width: 24 }} />}
          {node.icon}
          <Text size="sm">{node.label}</Text>
        </Group>
        
        {hasChildren && (
          <Collapse in={isExpanded}>
            {node.children!.map(child => renderNode(child, level + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {data.map(node => renderNode(node))}
    </Box>
  );
}
