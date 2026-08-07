Read the files relevant to the task being executed:

docs/database.md - database-related
docs/frontend.md - frotend-related

## Important Notes

Applied to all tasks

1. Always run `nvm use` at the start of a shell interaction so the correct node version is used. (see `.nvmrc`)
2. Avoid using the `any` type. Always use strong typing.
3. Avoid casting; properly handle mismatched types by the use of type-narrowing if-statements and functions. Prefer runtime checks such as `typeof`, `Array.isArray`, `instanceof`, and custom type guard functions over direct `as` casts.
   Example: `function isXYZ(value: unknown): value is XYZ`
4. Write code that promotes easy automated testing. Use techniques like dependency injection to simplify testing infrastructure (Ex. not having to mock module scoped imports or variables)
5. Run ESLint to check for unused imports/variables and fix issues before committing. Use `npm run lint` to check and `npm run lint:fix` to auto-fix.
6. Avoid typing a variable both as undefined and nullable. Favour `undefined` over `null` where possible. Only inject `null` when a database field requires it, and convert incoming/outgoing values to `undefined` so the backend/frontend code bases can use `undefined` throughout.

## Test Files - Type Hinting Best Practices

7. **Use `vi.mocked()` for proper type inference in tests** instead of casting with `as unknown as`:
   - ❌ Avoid: `const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };`
   - ✅ Prefer: `const mockedApi = vi.mocked(api);` - maintains full type safety

8. **Use typed mock functions** where practical:
   - ✅ Prefer: `vi.fn<ReturnType>()` for return type specification
   - For complex API mocks, use `vi.mocked()` which automatically provides correct typing

9. **Type guards for partial mocks**: When mocking only partial object state (common in store selectors), document the pragmatic trade-off:
   - Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with explanation when `any` is necessary for test setup
   - Example: store selector mocks that only provide partial state for unit test isolation

10. **In Storybook/story files**, use standard vitest utilities:
    - Mock API calls with `vi.mock()` before imports
    - Use `vi.mocked()` to access mocked implementations with proper typing
    - Avoid direct property assignment (e.g., `api.get = async () => ...`) - use `vi.mocked(api.get).mockResolvedValue()` instead

## Frontend State Management - isOwnOrigin Subscription Pattern

1.  **Prefer subscription-based updates over awaiting on API calls**
    
    When a component makes an API call that triggers a WebSocket message, use the `isOwnOrigin` subscription pattern instead of callbacks. This pattern is implemented in the WebSocket handlers and allows components to directly subscribe to store updates.

    **Why**: Reduces prop drilling, improves component isolation, and aligns with reactive state management best practices.

    ### Bad Example ❌ (awaiting)
    ```tsx
    // Component makes API call, then awaits to take actino or callback to parent.
    
    export function MyComponent() {
      ...
      const handleToggle = async () => {
        await api.patch('/api/...'); // some API call
        // react to api call finish
      };
      ...
    }
    ```

    ### Good Example ✅ (Subscription-based, self-contained)
    ```tsx
    // Component subscribes to store updates directly
    // When API succeeds, WebSocket message arrives with isOwnOrigin=true
    // Store update fires, listeners are invoked
    // Component subscribes to listener and updates local state
    // No prop drilling needed, component is self-contained
    
    export function MyComponent() {
      ...
      const subscribe = useSomeStore((state) => state.subscribe);
      const unsubscribe = useSomeStore((state) => state.unsubscribe);

      useEffect(() => {
        const handleUpdate = () => {
          ...
        };

        subscribe({
          event: 'updated',
          callback: handleUpdate,
        });

        return () => {
          unsubscribe({
            event: 'updated',
            callback: handleUpdate,
          });
        };
      }, [...]);
    }
    ```

    ### When to use subscription pattern
    - ✅ Component makes an API call that results in entity creation/update/deletion
    - ✅ Component needs to react to changes triggered by the same action like updating local state, navigating to another route, etc
    - ✅ Multiple components might update the same entity (need reactive sync)

    ### When callback props are acceptable
    - ✅ No api calls are being made, or the api call does not alter entities.
    - ✅ When the updated entity is already configured to re-render automatically based on zustand & react lifecycle.
