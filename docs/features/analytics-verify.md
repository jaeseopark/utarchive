ensure the frontend's local state tracks playback activities and is able to handle pauses, trimmed song's durations (if applicable) and sends request to backend route when the song:
1. pauses for more than 24 hours (should clear 'now playing' afterwards so the user cannot resume and mess up the count.)
2. browser tab closing; or
3. player goes to the next track either on demand by the user or by finishing the current track.

