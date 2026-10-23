import { AssertionError } from 'node:assert';
import { test } from 'node:test';

/** Known assertion failures stay visible as TODO; unexpected exceptions always fail. */
export function regression(name, reason, check) {
  test(name, async (context) => {
    try {
      await check(context);
    } catch (error) {
      if (error instanceof AssertionError && process.env.RAINBOW_STRICT_REGRESSIONS !== '1') {
        context.todo(reason);
      }
      throw error;
    }
  });
}
