# Notification Center

Replace the WebSocket connection indicator with a comprehensive notification center featuring a bell icon with badge, anchored dropdown for recent notifications, and a full-page view for all notifications.

## Overview

The notification center provides a centralized hub for user notifications across the application. It replaces the simple connection status indicator with a more powerful system that supports multiple notification types (error, success, info, warning) and makes it easy for any component or hook to enqueue notifications.

### Key Features

- **Bell Icon UI**: Intuitive bell icon replacing text-based connection indicator
- **Status Indicator**: Color-coded dot (green/yellow/red) shows WebSocket connection status
- **Unread Badge**: Displays count of unread notifications in top-right corner
- **Dropdown Modal**: Anchored to bell icon, shows last 3 notifications with read/unread styling
- **Full Page View**: `/notifications` route displays all notifications for the session
- **Zustand Store**: Global state management for notifications, accessible from anywhere
- **Type Safety**: Multiple notification types with distinct styling
- **Read/Unread**: Mark individual notifications or all as read
- **WebSocket Integration**: WebSocket handler can enqueue notifications (pattern established for future server-pushed notifications)

## Motivation

### Problems Solved

1. **Scattered Error Display**: Currently, errors are displayed inline in components (upload failures, form errors, etc.). This leads to:
   - User might miss errors if not focused on the component
   - No centralized history of what went wrong
   - Inconsistent UX across the app

2. **Limited WebSocket Status Visibility**: The current connection indicator only shows text ("Connected", "Connecting...", "Offline") which:
   - Takes up horizontal space and hides on mobile
   - Is less intuitive than a visual indicator

3. **No Notification System**: Common scenarios lack proper feedback:
   - Upload completion/failure
   - API errors
   - WebSocket connection issues
   - Future server-initiated notifications

## Architecture

### State Management

**Location**: `frontend/src/stores/useNotificationStore.ts`

Zustand store following the project's established patterns ([usePlaylistsStore.ts](../src/stores/usePlaylistsStore.ts)):

```typescript
interface Notification {
  id: string;                              // Unique identifier (UUID or timestamp-based)
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationStoreState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  
  // Selectors
  getLastN: (n: number) => Notification[];
  getUnreadCount: () => number;
}
```

### Storage

- **In-memory only**: Notifications are cleared on page refresh
- **Unlimited capacity**: No automatic expiration or max count
- **Session-scoped**: Each session maintains its own notification history

### Types

**Location**: `frontend/src/types/notification.ts`

```typescript
export type NotificationType = 'error' | 'success' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationStoreState {
  // ... (see above)
}
```

## UI Components

### NotificationCenter Component

**Location**: `frontend/src/components/NotificationCenter.tsx`

Container component combining the bell icon and dropdown. Manages open/closed state and click-outside behavior.

```typescript
export function NotificationCenter(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  
  // ... click-outside detection
  
  return (
    <div ref={bellRef} className="relative">
      <NotificationBellIcon 
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
      {isOpen && (
        <NotificationDropdown 
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

**Integration in Header**: Replace [ConnectionStatusIndicator](../src/components/ConnectionStatusIndicator.tsx) in [RootLayout.tsx](../src/layouts/RootLayout.tsx#L36-L38)

### NotificationBellIcon Component

**Location**: `frontend/src/components/NotificationBellIcon.tsx`

Bell icon with status indicator dot and unread badge.

**Features**:
- Bell icon from Lucide React or Heroicons (matching existing icon style)
- Status dot overlay: green/yellow/red based on WebSocket connection status (from `useWebSocketContext()`)
- Unread badge: Shows count of unread notifications, positioned top-right with `absolute top-0 right-0 translate-x-1/2 -translate-y-1/2`
- Click handler to toggle dropdown
- Hover state: Subtle background change for affordance

**Styling**:
```
- Bell icon: text-slate-700, hover:bg-slate-100
- Status dot: Absolute position, size 10px, green-500/yellow-500/red-500, pulsing animation if connecting
- Badge: bg-red-500, text-white, rounded-full, font-bold, size 20px, centered number
```

### NotificationDropdown Component

**Location**: `frontend/src/components/NotificationDropdown.tsx`

Anchored dropdown showing last 3 notifications. **New pattern** - first anchored dropdown in the codebase.

**Features**:
- Position: `position: absolute` anchored to bell icon (top-right area)
- Shows last 3 notifications via `store.getLastN(3)`
- Unread styling: 
  - Unread: `bg-blue-50` with `font-semibold` text
  - Read: `bg-white` with normal weight
- Individual notifications clickable to mark as read
- "Mark all as read" button at top
- "See all notifications" link at bottom navigates to `/notifications`
- Empty state: "No notifications yet" message
- Scrollable: `max-h-[500px] overflow-y-auto` if content exceeds
- Closes on outside click (handled by parent NotificationCenter)
- Z-index: `z-50` or higher for overlay

**Styling Pattern** (matches existing modals from [AddSongModal.tsx](../src/components/AddSongModal.tsx)):
```
Card: rounded-2xl bg-white shadow-2xl shadow-slate-200/40 p-6
Width: w-96 (max-w-sm or ~400px)
Spacing: gap-3 between notifications
Dividers: border-t border-slate-200 between sections
```

**Notification Item Styling**:
```
Base: px-4 py-3 rounded-lg cursor-pointer
Unread: bg-blue-50 border-l-2 border-l-blue-500 font-semibold text-slate-900
Read: bg-white text-slate-600
Error type: bg-red-50/red-100, text-red-700
Success type: bg-green-50/green-100, text-green-700
Warning type: bg-yellow-50/yellow-100, text-yellow-700
Info type: bg-blue-50/blue-100, text-blue-700
```

### NotificationsPage Component

**Location**: `frontend/src/pages/NotificationsPage.tsx`

Full-page view displaying all notifications in the session.

**Layout**:
```
Header: "Notifications" title
Toolbar: "Mark all as read" and "Clear all" buttons
Content: All notifications from store in chronological order (newest first)
  - Grouped by read/unread status (optional, can also be flat)
  - Each notification clickable to mark as read
  - Same styling as dropdown notifications
Empty state: "No notifications" message if store is empty
Sidebar/Navigation: Include in left nav or accessible only via dropdown link
```

**Styling**: Follow existing page patterns from [ArtistsPage.tsx](../src/pages/ArtistsPage.tsx):
```
Page wrapper: Container with sidebar layout
Card list: Divide notifications into readable cards
```

## Integration

### WebSocket Handler Integration

**Location**: `frontend/src/lib/webSocketHandlers.ts` or `frontend/src/hooks/useWebSocketIntegration.ts`

Add notification enqueue on WebSocket error or significant events:

```typescript
import { useNotificationStore } from '../stores/useNotificationStore';

// Example: Handle ERROR message type
if (message.type === 'ERROR') {
  useNotificationStore.getState().addNotification({
    type: 'error',
    message: `WebSocket error: ${message.detail}`,
  });
}

// Pattern established for future server-pushed notifications
// (no immediate use case, but ready for expansion)
```

### Component Integration

Replace inline error displays with notification enqueue. Example locations:

1. **AudioUploadButton.tsx**: Replace upload error state display
```typescript
// Before: Display error inline with text-red-700
// After: 
const { addNotification } = useNotificationStore();
try {
  // upload logic
} catch (error) {
  addNotification({
    type: 'error',
    message: `Upload failed: ${error.message}`,
  });
}
```

2. **Form submissions**: Enqueue success/error notifications instead of inline banners

3. **Async operations**: Replace loading+error states with notifications for completion

### Convenience Hook

**Location**: `frontend/src/hooks/useNotifications.ts` (optional)

Helper hook for common notification patterns:

```typescript
export function useNotifications() {
  const addNotification = useNotificationStore(s => s.addNotification);
  
  return {
    notifySuccess: (message: string) => addNotification({ type: 'success', message }),
    notifyError: (message: string) => addNotification({ type: 'error', message }),
    notifyInfo: (message: string) => addNotification({ type: 'info', message }),
    notifyWarning: (message: string) => addNotification({ type: 'warning', message }),
  };
}

// Usage in components:
const { notifyError, notifySuccess } = useNotifications();
try {
  await uploadSong(file);
  notifySuccess('Song uploaded successfully!');
} catch (error) {
  notifyError('Failed to upload song');
}
```

## Routing

**Location**: `frontend/src/App.tsx`

Add route for full notifications page:

```typescript
<Route path="/notifications" element={<NotificationsPage />} />
```

Place under ProtectedRoute and RootLayout (same level as `artists`, `songs`, etc.).

## Styling

### Color Scheme

Match existing project palette (Tailwind slate with sky accent):

| Type | Background | Text | Border |
|------|-----------|------|--------|
| Error | `bg-red-50` | `text-red-700` | `border-red-200` |
| Success | `bg-green-50` | `text-green-700` | `border-green-200` |
| Warning | `bg-yellow-50` | `text-yellow-700` | `border-yellow-200` |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| Unread (any type) | Same, but lighter/bolder | `font-semibold` | Add left border accent |

### Icon

- Icon library: Lucide React or Heroicons (check package.json for existing)
- Bell icon component: `Bell` or `BellIcon`
- Size: `24px` (w-6 h-6 in Tailwind)
- Color: `text-slate-700`
- Hover: `hover:text-slate-900` or `hover:bg-slate-100`

## Implementation Steps

### Phase 1: Foundation (Priority 1)
1. Create `frontend/src/types/notification.ts`
2. Create `frontend/src/stores/useNotificationStore.ts`

### Phase 2: UI Components (Priority 2)
3. Create `frontend/src/components/NotificationBellIcon.tsx`
4. Create `frontend/src/components/NotificationDropdown.tsx` (first anchored dropdown)
5. Create `frontend/src/components/NotificationCenter.tsx`
6. Update [RootLayout.tsx](../src/layouts/RootLayout.tsx) to use NotificationCenter

### Phase 3: Full Page (Priority 3)
7. Create `frontend/src/pages/NotificationsPage.tsx`
8. Add route in [App.tsx](../src/App.tsx)

### Phase 4: Integration (Priority 4)
9. Integrate with WebSocket handler
10. Replace inline errors in components (e.g., AudioUploadButton)
11. Create `frontend/src/hooks/useNotifications.ts` convenience hook

## Testing Checklist

### Automated Tests
- [ ] Run `npm run lint` - no unused imports or type errors
- [ ] Run `npm run build` - no build errors
- [ ] Notification store unit tests (optional)
- [ ] Component snapshot tests (optional)

### Manual Testing

**Bell Icon & Badge**:
- [ ] Bell icon visible in header with WebSocket status color
- [ ] No badge when 0 unread notifications
- [ ] Badge appears with count when notifications added
- [ ] Badge updates as notifications marked read
- [ ] Status dot color changes with WebSocket state (green/yellow/red)

**Dropdown Interaction**:
- [ ] Click bell opens dropdown
- [ ] Dropdown anchored near bell icon (not off-screen)
- [ ] Shows last 3 notifications
- [ ] Unread notifications have distinct styling (blue background, bold text)
- [ ] Click notification marks as read (styling changes, badge count updates)
- [ ] "Mark all as read" marks all as read and clears badge
- [ ] "See all notifications" navigates to `/notifications`
- [ ] Click outside dropdown closes it
- [ ] Scrollbar appears if content exceeds max-height

**Full Page View**:
- [ ] Navigate to `/notifications` shows all notifications
- [ ] Read/unread styling consistent with dropdown
- [ ] Click notification marks as read
- [ ] "Mark all as read" works
- [ ] "Clear all" removes all notifications
- [ ] Empty state displays when no notifications
- [ ] Breadcrumb or back link returns to previous page

**Multiple Types**:
- [ ] Error notification: red styling
- [ ] Success notification: green styling
- [ ] Warning notification: yellow styling
- [ ] Info notification: blue styling

**WebSocket Integration**:
- [ ] Simulate WebSocket connection loss - error notification appears (if implemented)
- [ ] Console test: `useNotificationStore.getState().addNotification({ type: 'success', message: 'Test' })` - notification appears

**Error Replacement**:
- [ ] Upload file error - notification appears instead of inline error (AudioUploadButton)
- [ ] Other component errors - notifications appear where applicable

## Browser Compatibility

- Modern browsers with ES2020+ support (Vite default)
- Tested on Chrome, Firefox, Safari, Edge
- Mobile responsive (bell icon visible on all screen sizes)
- Dropdown should not overflow viewport on small screens

## Performance Considerations

- **Unlimited notifications**: Current in-memory approach is fine for typical usage. If list grows beyond 100+ items on full page, consider virtualization (react-window) in future.
- **Zustand efficiency**: Using selector pattern (`store((state) => state.notifications)`) to avoid unnecessary re-renders
- **Dropdown mounting**: Only mounts when open, minimizes memory footprint

## Accessibility

Recommendations for future enhancement:

- Add `aria-label="Notifications"` to bell icon
- Add `aria-live="polite"` region for new notifications announcement
- Keyboard navigation: Escape to close dropdown, Tab to navigate items
- Screen reader: Announce unread count in badge
- Focus management: Focus bell when dropdown closes

## Future Enhancements

1. **Auto-dismiss**: Success/info notifications auto-dismiss after 3-5 seconds
2. **Notification Actions**: Add buttons to notifications (e.g., "Retry Upload", "View Song")
3. **Categories/Filtering**: Tag notifications or filter by type on full page
4. **Persistence**: Store in localStorage or backend for cross-session access
5. **Desktop Notifications**: Use Notification API for browser notifications when tab is unfocused
6. **Sound**: Optional notification sound for important alerts
7. **Server-Pushed Notifications**: WebSocket handler enqueues server-sent notifications (pattern already established)

## Files to Create

```
frontend/
  src/
    types/
      notification.ts                 # Type definitions
    stores/
      useNotificationStore.ts         # Zustand store
    components/
      NotificationBellIcon.tsx        # Bell icon with badge
      NotificationDropdown.tsx        # Anchored dropdown (new pattern)
      NotificationCenter.tsx          # Container component
    pages/
      NotificationsPage.tsx           # Full page view
    hooks/
      useNotifications.ts             # Optional convenience hook
```

## Files to Modify

- `frontend/src/layouts/RootLayout.tsx` - Replace ConnectionStatusIndicator with NotificationCenter
- `frontend/src/App.tsx` - Add `/notifications` route
- `frontend/src/lib/webSocketHandlers.ts` - Add notification enqueue example
- `frontend/src/components/AudioUploadButton.tsx` - Replace inline error with notification

## References

- [Zustand Store Patterns](../../src/stores/usePlaylistsStore.ts)
- [Modal Styling](../../src/components/AddSongModal.tsx)
- [WebSocket Context](../../src/context/WebSocketContext.tsx)
- [Current Connection Indicator](../../src/components/ConnectionStatusIndicator.tsx)
- [React Router Setup](../../src/App.tsx)
