Read the files relevant to the task being executed:

docs/database.md - database-related

## Important Notes

Applied to all tasks

1. Avoid using the `any` type. Always use strong typing.
2. Avoid casting; properly handle mismatched types by the use of type-narrowing if-statements and functions. Prefer runtime checks such as `typeof`, `Array.isArray`, `instanceof`, and custom type guard functions over direct `as` casts.
   Example: `function isXYZ(value: unknown): value is XYZ`
3. When adding a new dependency to package.json, always pull the latest version available on npm by querying npm: `npm view <package-name> version`
4. Write code that promotes easy automated testing. Use techniques like dependency injection to simplify testing infrastructure (Ex. not having to mock module scoped imports or variables)
