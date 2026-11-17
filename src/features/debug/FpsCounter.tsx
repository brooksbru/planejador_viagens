import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '@/theme';

const WINDOW = 30; // quadros por medição

/**
 * Medidor de quadros por segundo, só para desenvolvimento.
 * UI: thread que desenha a tela e roda a névoa. JS: thread da lógica do app.
 */
export function FpsCounter() {
  const { colors, typography, numbers, space, radius } = useTheme();
  const [uiFps, setUiFps] = useState(0);
  const [jsFps, setJsFps] = useState(0);

  const frames = useSharedValue(0);
  const elapsed = useSharedValue(0);

  useFrameCallback((info) => {
    frames.value += 1;
    elapsed.value += info.timeSincePreviousFrame ?? 0;
    if (frames.value >= WINDOW) {
      runOnJS(setUiFps)(Math.round((frames.value * 1000) / elapsed.value));
      frames.value = 0;
      elapsed.value = 0;
    }
  });

  useEffect(() => {
    let handle = 0;
    let count = 0;
    let start = performance.now();
    const tick = () => {
      count += 1;
      if (count >= WINDOW) {
        const now = performance.now();
        setJsFps(Math.round((count * 1000) / (now - start)));
        count = 0;
        start = now;
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, []);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.control,
        paddingHorizontal: space[2],
        paddingVertical: space[1],
      }}
    >
      <Text style={[typography.caption, numbers.numList, { color: colors.textPrimary }]}>
        UI {uiFps} fps · JS {jsFps} fps
      </Text>
    </View>
  );
}
