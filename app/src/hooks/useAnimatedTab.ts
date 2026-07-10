import { useCallback, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Animated tab switcher with slide + fade transition, driven by either
 * tapping a segmented control or swiping the content area left/right.
 *
 * Usage:
 *   const { panHandlers, animStyle, switchTo } = useAnimatedTab(TABS, tab, setTab);
 *   <SegmentedControl onChange={t => switchTo(t, dir)} ... />
 *   <Animated.View style={[{ flex: 1 }, animStyle]} {...panHandlers}>{content}</Animated.View>
 */
export function useAnimatedTab<T extends string>(
  tabs: readonly T[],
  tab: T,
  setTab: (t: T) => void,
) {
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);

  const switchTo = useCallback((newTab: T, direction: 'left' | 'right') => {
    if (newTab === tabRef.current || animating.current) return;
    animating.current = true;

    const outX = direction === 'left' ? -50 : 50;
    const inX = direction === 'left' ? 50 : -50;

    Animated.parallel([
      Animated.timing(translateX, { toValue: outX, duration: 110, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      translateX.setValue(inX);
      setTab(newTab);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start(() => { animating.current = false; });
    });
  }, [setTab, translateX, opacity]);

  /** For onChange handlers wired straight to a value (no direction tracking needed at the call site). */
  const setTabAnimated = useCallback((newTab: T) => {
    const idx = tabs.indexOf(newTab);
    const currentIdx = tabs.indexOf(tabRef.current);
    switchTo(newTab, idx > currentIdx ? 'left' : 'right');
  }, [tabs, switchTo]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.8 && Math.abs(g.dx) > 12,
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) < 40) return;
        const idx = tabs.indexOf(tabRef.current);
        if (g.dx < 0 && idx < tabs.length - 1) switchTo(tabs[idx + 1], 'left');
        else if (g.dx > 0 && idx > 0) switchTo(tabs[idx - 1], 'right');
      },
    }),
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    animStyle: { transform: [{ translateX }], opacity },
    switchTo,
    setTabAnimated,
  };
}
