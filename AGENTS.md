Read the files relevant to the task being executed:

docs/database.md - database-related
docs/frontend.md - frotend-related

## Important Notes

Applied to all tasks

1. Always run `nvm use` at the start of a shell interaction so the correct node version is used. (see `.nvmrc`)
1. Avoid using the `any` type. Always use strong typing.
2. Avoid casting; properly handle mismatched types by the use of type-narrowing if-statements and functions. Prefer runtime checks such as `typeof`, `Array.isArray`, `instanceof`, and custom type guard functions over direct `as` casts.
   Example: `function isXYZ(value: unknown): value is XYZ`
3. After adding one or more new dependencies to package.json, Create a report of the latest version available on npm vs what is used in package.json. Use the following command: `npm view <package-name> version` 
4. Write code that promotes easy automated testing. Use techniques like dependency injection to simplify testing infrastructure (Ex. not having to mock module scoped imports or variables)
5. Scan for include unused imports/variables and remove them proactively at the end of each task.
6. Avoid typing a variable both as undefined and nullable. Favour `undefined` over `null` where possible. Only inject `null` when a database field requires it, and convert incoming/outgoing values to `undefined` so the backend/frontend code bases can use `undefined` throughout.
