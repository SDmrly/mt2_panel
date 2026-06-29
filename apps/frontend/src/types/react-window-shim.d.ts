// Type shim for react-window v1 (FixedSizeList) — v1.x ships no .d.ts,
// so tsc resolves to v2 at root which lacks FixedSizeList.
// This declaration restores v1 compatibility for build purposes.
import type * as React from 'react';

declare module 'react-window' {
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
  }

  export interface FixedSizeListProps {
    height: number | string;
    width: number | string;
    itemCount: number;
    itemSize: number;
    children: (props: ListChildComponentProps) => React.ReactElement;
    overscanCount?: number;
    className?: string;
    style?: React.CSSProperties;
    onScroll?: (params: { scrollDirection: 'forward' | 'backward'; scrollOffset: number; scrollUpdateWasRequested: boolean }) => void;
    onItemsRendered?: (params: { overscanStartIndex: number; overscanStopIndex: number; visibleStartIndex: number; visibleStopIndex: number }) => void;
    initialScrollOffset?: number;
    direction?: 'ltr' | 'rtl';
    layout?: 'horizontal' | 'vertical';
    useIsScrolling?: boolean;
    innerElementType?: React.ElementType;
    outerElementType?: React.ElementType;
  }

  export class FixedSizeList extends React.Component<FixedSizeListProps> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
  }

  export interface VariableSizeListProps extends Omit<FixedSizeListProps, 'itemSize'> {
    itemSize: (index: number) => number;
    estimatedItemSize?: number;
  }

  export class VariableSizeList extends React.Component<VariableSizeListProps> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  export function areEqual(prevProps: object, nextProps: object): boolean;
  export function shouldComponentUpdate(nextProps: object, nextState: object): boolean;
}
