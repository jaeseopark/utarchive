# WebSocket Real-Time Sync Feature

## Context

While this is a single user app, the user may have multiple tabs across multiple devices, and the app needs to remain up to date when one device mutates (CRUD) data.

## Current approach

1. Assume the user is on a single device.
2. Lazy-load when the local state is empty for each entity type.
3. Mutate local state right when changes happen (keeps in sync with server side).

## Newly Proposed Approach

1. Upon mutation, the user sends the data mutation signal to the backend which triggers database update(s) as needed.
   a. Server answers with HTTP 200 to indicate success, or an appropriate error code/message body.
   b. Process returned body to handle necessary UI interactions (ex. closing the modal, navigating to designated routes, etc).
2. Simultaneously, API broadcasts the changes to all connected devices.
3. Frontend client handles websocket messages so all devices stay up to date (usually triggers no UI updates other than quietly updating local state which may or may not update the view the user is currently looking at).
   a. This websocket message is idempotent in nature, so it ends up being a no-op to the client that triggered the original mutation.

## Additional Requirements

The full archive size is expected to be small (20k songs at most) which fits comfortably on most modern devices. Hydrate the local state with the entirety of the database upon UI startup, so the UI is snappy (example: sorting all songs by a field).

---

## Technical Implementation Details

### Message Format

All WebSocket messages follow a consistent structure:

```typescript
type WebSocketMessage = {
  type: 'ENTITY_CREATED' | 'ENTITY_UPDATED' | 'ENTITY_DELETED' | 'BULK_UPDATE';
  entity: 'song' | 'album' | 'artist' | 'playlist' | 'coverArt';
  timestamp: number; // Unix timestamp in milliseconds
  data: unknown; // Entity-specific payload
  requestId?: string; // Optional client request ID for deduplication
};

// Specific message types
type SongCreatedMessage = {
  type: 'ENTITY_CREATED';
  entity: 'song';
  timestamp: number;
  data: Song;
  requestId?: string;
};

type SongUpdatedMessage = {
  type: 'ENTITY_UPDATED';
  entity: 'song';
  timestamp: number;
  data: Partial<Song> & { id: string };
  requestId?: string;
};

type SongDeletedMessage = {
  type: 'ENTITY_DELETED';
  entity: 'song';
  timestamp: number;
  data: { id: string };
  requestId?: string;
};

type BulkUpdateMessage = {
  type: 'BULK_UPDATE';
  entity: 'song' | 'album' | 'artist' | 'playlist';
  timestamp: number;
  data: {
    created?: Array<unknown>;
    updated?: Array<unknown>;
    deleted?: Array<{ id: string }>;
  };
  requestId?: string;
};
```

### Connection Lifecycle

#### Client Connection

1. **Initial Connection**
   - Client establishes WebSocket connection to `/ws` endpoint
   - Server validates JWT token from query parameter or initial message
   - Server adds client to authenticated connections pool
   - Client receives `CONNECTED` confirmation message

2. **Full State Hydration**
   - Immediately after connection, client fetches all entities via REST API
   - Client stores complete state locally (Zustand/Redux/etc.)
   - This provides baseline for incremental updates

3. **Heartbeat/Ping-Pong**
   - Client sends `PING` every 30 seconds
   - Server responds with `PONG`
   - If 3 consecutive pings fail, client initiates reconnection

#### Disconnection Scenarios

1. **Graceful Disconnect**
   - User closes tab: WebSocket cleanup happens automatically
   - Server removes client from broadcast pool

2. **Network Interruption**
   - Client detects disconnect via failed ping or connection error
   - Client immediately attempts reconnection with exponential backoff
   - Upon reconnection, client compares local state timestamp with server
   - If gap > 5 seconds, trigger full state refresh via REST API

3. **Server Restart**
   - All clients disconnect and attempt reconnection
   - Exponential backoff prevents thundering herd
   - Clients refresh full state after reconnecting

### Backend Broadcasting

#### Broadcast Strategy

```typescript
// After successful database mutation
const broadcastChange = (wss: WebSocketServer, message: WebSocketMessage) => {
  const payload = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// Example usage in route handler
router.post('/songs', requireAuth, async (req, res) => {
  const song = await db.insert(songs).values(req.body).returning();
  
  // Respond to HTTP request
  res.status(201).json(song);
  
  // Broadcast to all connected clients
  broadcastChange(req.app.locals.wss, {
    type: 'ENTITY_CREATED',
    entity: 'song',
    timestamp: Date.now(),
    data: song,
    requestId: req.headers['x-request-id']
  });
});
```

#### Authentication

- WebSocket endpoint requires valid JWT token
- Token passed via query parameter on initial connection: `ws://server/ws?token=<jwt>`
- Server validates token before accepting connection
- Invalid/expired tokens result in immediate connection rejection

### Frontend State Management

#### Message Handling

```typescript
// WebSocket message handler
const handleWebSocketMessage = (message: WebSocketMessage) => {
  const { type, entity, data, requestId } = message;
  
  // Skip if this client initiated the change (deduplication)
  if (requestId && requestId === getCurrentRequestId()) {
    return;
  }
  
  // Apply state update based on message type
  switch (type) {
    case 'ENTITY_CREATED':
      store.dispatch(addEntity(entity, data));
      break;
    case 'ENTITY_UPDATED':
      store.dispatch(updateEntity(entity, data));
      break;
    case 'ENTITY_DELETED':
      store.dispatch(removeEntity(entity, data.id));
      break;
    case 'BULK_UPDATE':
      store.dispatch(bulkUpdate(entity, data));
      break;
  }
};
```

#### Deduplication

To prevent clients from processing their own changes twice:

1. Client generates unique `requestId` (UUID) for each mutation request
2. Client stores `requestId` in a Set with 5-second TTL
3. When receiving WebSocket message, check if `requestId` exists in Set
4. If found, skip processing (this client already applied the change locally)
5. If not found, apply the change

```typescript
const recentRequestIds = new Map<string, number>(); // requestId -> timestamp

const isOwnRequest = (requestId: string | undefined): boolean => {
  if (!requestId) return false;
  
  const timestamp = recentRequestIds.get(requestId);
  if (!timestamp) return false;
  
  // Clean up old entries
  if (Date.now() - timestamp > 5000) {
    recentRequestIds.delete(requestId);
    return false;
  }
  
  return true;
};

// When making API request
const createSong = async (songData: SongInput) => {
  const requestId = crypto.randomUUID();
  recentRequestIds.set(requestId, Date.now());
  
  const response = await fetch('/api/songs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId
    },
    body: JSON.stringify(songData)
  });
  
  // Optimistically update local state
  const newSong = await response.json();
  store.dispatch(addSong(newSong));
  
  return newSong;
};
```

### Reconnection Strategy

#### Exponential Backoff

```typescript
const reconnectDelays = [1000, 2000, 5000, 10000, 30000]; // milliseconds
let reconnectAttempt = 0;

const reconnect = () => {
  const delay = reconnectDelays[Math.min(reconnectAttempt, reconnectDelays.length - 1)];
  
  setTimeout(() => {
    reconnectAttempt++;
    establishConnection();
  }, delay);
};

const establishConnection = () => {
  const ws = new WebSocket(`${WS_URL}?token=${getAuthToken()}`);
  
  ws.onopen = () => {
    reconnectAttempt = 0; // Reset on successful connection
    startHeartbeat();
  };
  
  ws.onerror = () => {
    reconnect();
  };
  
  ws.onclose = () => {
    stopHeartbeat();
    reconnect();
  };
};
```

#### State Reconciliation After Reconnect

```typescript
const handleReconnection = async () => {
  const lastSyncTime = getLastSyncTimestamp();
  const now = Date.now();
  
  // If disconnected for more than 5 seconds, do full refresh
  if (now - lastSyncTime > 5000) {
    await fetchAllEntities();
  }
  // Otherwise, trust that queued messages will arrive
  
  setLastSyncTimestamp(now);
};
```

### Error Handling

#### Backend Errors

1. **Database Failure**
   - HTTP endpoint returns error immediately
   - No WebSocket broadcast occurs
   - Client shows error message and reverts optimistic update

2. **Broadcast Failure**
   - Individual client send failures are logged but don't block
   - Dead connections are automatically cleaned up
   - Clients will resync on next mutation or reconnection

#### Frontend Errors

1. **Connection Failed**
   - Show non-intrusive connection status indicator
   - Continue operating in read-only mode with cached data
   - Prevent mutations until connection restored

2. **Message Parse Error**
   - Log error but don't crash
   - Skip malformed message
   - Continue processing subsequent messages

3. **State Consistency Error**
   - If update references non-existent entity, log warning
   - Optionally trigger targeted entity refetch
   - Don't block other updates

### Edge Cases & Conflict Resolution

#### Multiple Rapid Updates

**Scenario:** User makes multiple changes in quick succession while offline.

**Solution:**
- Queue mutations locally
- When connection restored, replay mutations in order
- Server processes them atomically and broadcasts results
- Other clients receive updates in correct order

#### Simultaneous Updates from Different Devices

**Scenario:** User updates song title on Device A while updating album on Device B.

**Solution:**
- Last-write-wins based on server timestamp
- Database updates are atomic and sequential
- Broadcasts reflect actual database state
- No client-side conflict resolution needed (single user)

#### Partial Entity Updates

**Scenario:** WebSocket message contains partial entity (only changed fields).

**Solution:**
- Frontend merges partial update with existing state
- Use spread operator: `{ ...existingEntity, ...partialUpdate }`
- Ensure `id` field always present for updates

#### Stale Connection Pool

**Scenario:** Server doesn't clean up disconnected WebSocket clients.

**Solution:**
- Check `client.readyState === WebSocket.OPEN` before sending
- Implement connection timeout (5 minutes idle → disconnect)
- Periodic cleanup of closed connections

### Performance Considerations

#### Message Size Optimization

- For single-entity changes, send only the affected entity
- For bulk operations (e.g., bulk import), use `BULK_UPDATE` with arrays
- Consider message compression for large payloads (future enhancement)

#### Broadcast Efficiency

- Current approach: O(n) broadcast to all clients
- With single user and ~5 devices max, this is negligible
- If scaling to multiple users, add user-based connection pools

#### Memory Management

- Frontend: Clean up event listeners on unmount
- Backend: Remove disconnected clients from pool
- Clear `recentRequestIds` Map entries older than 5 seconds

### Testing Strategy

#### Unit Tests

1. **Message Serialization/Deserialization**
   - Test all message types can be stringified and parsed
   - Validate schema conformance

2. **Deduplication Logic**
   - Test `isOwnRequest()` correctly identifies own requests
   - Test TTL cleanup of old request IDs

3. **State Reducers**
   - Test each message type correctly updates state
   - Test partial updates merge correctly

#### Integration Tests

1. **Connection Lifecycle**
   - Test initial connection and authentication
   - Test graceful disconnection
   - Test reconnection after network interruption

2. **End-to-End Message Flow**
   - Client A creates song → Client B receives update
   - Client A updates song → Client B reflects change
   - Client A deletes song → Client B removes from UI

3. **Conflict Scenarios**
   - Rapid sequential updates
   - Reconnection with stale state
   - Malformed message handling

#### Manual Testing

1. **Multi-Device Sync**
   - Open app on phone and laptop
   - Create/update/delete entities on one device
   - Verify other device updates within 1 second

2. **Network Interruption**
   - Disconnect WiFi mid-session
   - Make changes in offline mode (should fail gracefully)
   - Reconnect and verify state syncs

3. **Server Restart**
   - Restart backend while clients connected
   - Verify all clients reconnect automatically
   - Verify state remains consistent

### Rollout Plan

#### Phase 1: Backend Infrastructure (Week 1)

- [ ] Implement WebSocket server with authentication
- [ ] Add broadcast helper function
- [ ] Integrate broadcasts into existing mutation endpoints (songs, albums, artists, playlists)
- [ ] Add WebSocket health check endpoint
- [ ] Deploy to staging

#### Phase 2: Frontend Connection (Week 2)

- [ ] Implement WebSocket client with reconnection logic
- [ ] Add connection status indicator to UI
- [ ] Implement heartbeat/ping mechanism
- [ ] Test reconnection scenarios
- [ ] Deploy to staging

#### Phase 3: State Synchronization (Week 3)

- [ ] Implement message handlers for all entity types
- [ ] Add request deduplication logic
- [ ] Update state management to handle remote updates
- [ ] Add optimistic updates with rollback on error
- [ ] Deploy to staging

#### Phase 4: Testing & Refinement (Week 4)

- [ ] Write comprehensive integration tests
- [ ] Multi-device manual testing
- [ ] Performance profiling
- [ ] Bug fixes and edge case handling
- [ ] Deploy to production

#### Phase 5: Monitoring & Optimization (Ongoing)

- [ ] Add logging for WebSocket events
- [ ] Monitor connection success rate
- [ ] Track message delivery latency
- [ ] Gather user feedback on sync experience

### Security Considerations

1. **Authentication**
   - All WebSocket connections require valid JWT
   - Tokens expire and require reauthentication
   - No anonymous connections allowed

2. **Message Validation**
   - Server validates message structure before broadcast
   - Client validates incoming messages against schema
   - Malformed messages are logged and discarded

3. **Rate Limiting**
   - Prevent message spam from misbehaving clients
   - Limit connections per user (e.g., 10 max)
   - Disconnect abusive clients

4. **Data Privacy**
   - WebSocket connection uses same authentication as HTTP API
   - Single-user app, so no cross-user data leakage possible
   - All connections over HTTPS/WSS in production

### Future Enhancements

1. **Selective Subscriptions**
   - Allow clients to subscribe only to specific entity types
   - Reduce unnecessary message processing

2. **Delta Synchronization**
   - Send only changed fields instead of full entities
   - Reduce bandwidth for large updates

3. **Offline Queue**
   - Persist pending mutations to localStorage
   - Replay when connection restored
   - Conflict resolution for long offline periods

4. **Batch Updates**
   - Coalesce rapid sequential updates into single broadcast
   - Reduce message frequency during bulk operations

5. **Server-Sent Events (SSE) Fallback**
   - For environments where WebSocket is blocked
   - Provides one-way server→client updates
   - Fallback to polling if SSE unavailable
