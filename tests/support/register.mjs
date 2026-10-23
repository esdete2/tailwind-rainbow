import { registerHooks } from 'node:module';

const api = new URL('./vscode.cjs', import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === 'vscode' ? { url: api, shortCircuit: true } : nextResolve(specifier, context);
  },
});
