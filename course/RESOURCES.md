# Deck Development Resources

## Knowledge

- [Node.js API documentation — process, child_process, fs, net](https://nodejs.org/docs/latest/api/)
  The primary reference for everything Deck's server does. Use for: process signals, exit codes, file watching, child process spawning for git, port probing.

- [Hono documentation](https://hono.dev/docs/)
  Deck's server framework. Use for: routing, middleware, request/response handling.

- [Vite documentation — Build guide](https://vite.dev/guide/build.html)
  Covers dev server, production builds, code splitting, plugin system. Use for: understanding what `vite build` produces and how to optimize it.

- [npm package.json reference — bin, files, exports](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
  The spec for publishing CLI tools. Use for: configuring Deck for `npx` distribution.

- [TanStack Router documentation](https://tanstack.com/router/latest/docs/framework/react/overview)
  Deck's client-side routing. Use for: route definitions, params, navigation.

- [Tiptap documentation](https://tiptap.dev/docs/editor/getting-started/overview)
  The rich text editor powering Deck's markdown editing. Use for: extending the editor, understanding extensions.

- [Git plumbing commands — Pro Git Book ch10](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
  How git works under the hood. Use for: building better git integration, understanding status/diff/blame output formats.

- [CSS Custom Properties — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
  Foundation of any theming system. Use for: building the token layer.

- [Commander.js documentation](https://github.com/tj/commander.js)
  The CLI framework Deck currently uses. Use for: subcommands, options, help text.

## Gaps

- No single end-to-end resource on "how to structure and publish a Node CLI tool to npm." Knowledge is scattered across blog posts — build from npm docs + direct experimentation.
- No resource yet on bundle analysis tooling (rollup-plugin-visualizer, source-map-explorer). Find before Module 04.

## Wisdom (Communities)

- [r/node](https://reddit.com/r/node)
  CLI tooling patterns and npm publishing questions.
- [Vite Discord](https://chat.vitejs.dev)
  Build/bundling questions specific to Vite.
