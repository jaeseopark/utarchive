all api routes should return a consistent error shape in case of non-200 level response.

proposed shape:

```json
{
    "error": {
        "message": "string", // mandatory field
        "metadata": {} // optional freeform object suited for each use case
    }
}
```
