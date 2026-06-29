// apps/frontend/src/lib/logLevel.test.tsx
import { levelColor } from './logLevel';
it('error/fatal kırmızı, warning sarı, info nötr', () => {
  expect(levelColor('error')).toMatch(/red/);
  expect(levelColor('fatal')).toMatch(/red/);
  expect(levelColor('warning')).toMatch(/yellow|amber/);
  expect(levelColor('info')).not.toMatch(/red|yellow/);
  expect(levelColor('unknown')).toMatch(/gray|slate/);
});
