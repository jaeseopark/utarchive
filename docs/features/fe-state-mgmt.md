1. use of smaller feature-oriented hooks or store solutions like zustand to capture multiple state variables and or shared global variables. The goal is to keep each component/file small so it is easy to unit test individual segments of code.
2. middleware to manage api calls instead of calling api directly from components (ideal if works well with the state management pattern from above)
