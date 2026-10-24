# Development toolchain

Use Node **24.22.1** from `.nvmrc` and pnpm **10.33.0** from `packageManager` in
`package.json`. With an existing nvm and pnpm installation:

```sh
nvm install
nvm use
pnpm install --frozen-lockfile --strict-peer-dependencies
pnpm test
pnpm run lint
pnpm run format:check
pnpm run test:host
pnpm run test:legacy
pnpm run build
```

The editor runners download VS Code 1.96.0 by default and use separate temporary
user-data and extension directories. They load the checkout as a development
extension; the legacy launcher does not install a VSIX. To choose another editor:

```sh
VSCODE_VERSION=stable pnpm run test:host
VSCODE_VERSION=stable pnpm run test:legacy
VSCODE_EXECUTABLE_PATH='/Applications/Visual Studio Code.app/Contents/MacOS/Code' pnpm run test:host
```

The executable override takes precedence over the requested version. Environment
assignment above uses POSIX shell syntax; in PowerShell set `$env:VSCODE_VERSION`
or `$env:VSCODE_EXECUTABLE_PATH` before invoking pnpm. Linux editor tests need a
display, for example `xvfb-run -a pnpm run test:host`.

`pnpm test` runs the strict Node suite, including the original review regressions
and lexical corpus fingerprints. `test:host` checks exact ranges and decoration
coordination in the actual editor. `test:legacy` preserves the older Mocha suite,
including its diagnostic benchmark; reports from that suite are not substitutes
for the controlled tokenizer benchmark. `pnpm run build` compiles and writes
`tailwind-rainbow.vsix` without installing or publishing it.

## Compatibility boundaries

| Tool                        | Selected version                  | Constraint                                                  |
| --------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Node for development and CI | 24.22.1                           | Node 24 LTS; independent of the editor's embedded runtime   |
| pnpm                        | 10.33.0                           | Exact package-manager pin and frozen lockfile               |
| TypeScript                  | 6.0.3, constrained to 6.0 patches | TypeScript ESLint 8.72 supports TypeScript below 6.1        |
| TypeScript ESLint           | 8.72.0                            | Supports ESLint 10 and the selected compiler                |
| ESLint                      | 10.13.0                           | Compatible plugins resolved with strict peer checks         |
| Prettier                    | 3.9.10                            | Existing formatting configuration retained                  |
| VSCE                        | 4.0.0                             | Requires Node 22 or newer; packaging verified under Node 24 |
| test-electron               | 3.1.0                             | Launch tooling runs under Node 24                           |
| Glob                        | 13.0.6                            | Ships its own types; supports the minimum editor runtime    |
| Mocha                       | 11.8.0                            | Runs inside VS Code 1.96's Node 20.18.1 runtime             |
| VS Code API types           | exactly 1.96.0                    | Matches the declared minimum editor version                 |
| Node API types              | 20.19.43, constrained to major 20 | Keeps runtime API types in the minimum editor's Node major  |

Mocha 12.0.3 is ESM and requires Node 20.19 or newer. Running it in VS Code 1.96
failed with `ERR_REQUIRE_ESM`; Mocha 11.8.0 remains compatible. Its transitive
Glob 10.5.0 dependency is deprecated and retained with this compatibility hold.
TypeScript 7 and newer Node API majors are deliberately outside the selected
toolchain. The extension retains `engines.vscode: ^1.96.0`, JavaScript target
ES2022 and Node16 module resolution. Ambient Node and Mocha types are explicit
because TypeScript 6 no longer includes ambient packages by default.

Jest and ts-jest are unused by the maintained Node and Mocha suites. The npm
`path` package is unnecessary because source imports use Node's built-in module.
`@types/glob` is unnecessary with Glob's bundled types. These four packages were
removed; no runtime npm dependency was added.

The pnpm build-script allowlist contains only `@vscode/vsce-sign`. Its reviewed
setup copies the platform signing helper supplied by its optional package. Other
dependency install scripts are not automatically enabled. An ordinary unsigned
VSIX build does not invoke signing or publishing.

## Verification and CI

The October 24 maintenance results and timing reports are in
[benchmarks/toolchain-update](../benchmarks/toolchain-update/README.md). A temporary
official Node archive, verified against its published SHA-256 checksum, supplied
Node 24 for that local run. Global runtimes and the normal editor profile were
not changed.

CI selects Node from `.nvmrc` and pnpm from `package.json`, then installs with
frozen-lockfile and strict peer checks. It runs formatting, lint, strict tests,
editor checks, legacy tests and a VSIX build across macOS, Linux and Windows with
VS Code 1.96.0 and stable. Its existing trigger is a push to main. Workflow syntax
and local macOS equivalents were checked; the hosted matrix has not been run as
part of this local maintenance work.

The VSIX contains production JavaScript, themes, metadata, documentation and
images. It excludes compiled tests, source, CI configuration, lockfile, research
documents, benchmark reports, prototypes and SDD records. VSCE invokes npm for
its prepublish hook; npm can print warnings about pnpm-specific configuration
keys. The local build succeeds with those warnings. Node 25 packaging is outside
the verified development toolchain.

Compatibility sources: [TypeScript ESLint supported versions](https://typescript-eslint.io/users/dependency-versions/),
[TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html),
[Node release status](https://nodejs.org/en/about/previous-releases),
[VSCE manifest](https://github.com/microsoft/vscode-vsce/blob/main/package.json),
[test-electron manifest](https://github.com/microsoft/vscode-test/blob/main/package.json),
[pnpm action setup](https://github.com/pnpm/action-setup),
[checkout action](https://github.com/actions/checkout) and
[Node setup action](https://github.com/actions/setup-node).
Selected package versions and engine requirements were also checked against npm
registry metadata on October 24, 2026.
