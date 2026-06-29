changes to songs table:

1. combine trim_start and trim_end into a single field in the songs table (string) comma separated

only start provided example: "30," (second number omitted)
only end provided example: ",45" (first number omitted)
both numbers provided example: "30,45"

2. include an optional file_hash field that will be used to reject duplicate content upon uploading
