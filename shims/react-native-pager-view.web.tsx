/**
 * Web shim for react-native-pager-view.
 * eas update exports for web; this replaces the native-only module
 * with a simple View-based container that renders the first child only.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';

interface PagerViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  initialPage?: number;
  scrollEnabled?: boolean;
  onPageSelected?: (e: any) => void;
  [key: string]: any;
}

const PagerView = React.forwardRef<View, PagerViewProps>(
  ({ children, style, initialPage = 0 }, ref) => {
    const pages = React.Children.toArray(children);
    return (
      <View ref={ref} style={[{ flex: 1 }, style]}>
        {pages[initialPage] ?? pages[0] ?? null}
      </View>
    );
  },
);

PagerView.displayName = 'PagerView';

export default PagerView;
