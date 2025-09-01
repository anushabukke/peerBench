# User Local Key Validation

This module provides validation for the user's "Data authenticity certifying private key" that is stored locally in the browser.

## Features

- **Secure Storage**: Keys are stored in localStorage with validation
- **Real-time Validation**: Input validation as the user types
- **Copy/Download**: Users can copy the key to clipboard or download as a file
- **Device-specific**: Keys are only stored on the current device

## Validation Rules

The user local key must meet the following criteria:

- **Length**: Between 1 and 1000 characters
- **Characters**: Only alphanumeric characters, +, /, =, _, and - are allowed
- **Format**: Must be a non-empty string

## Usage

### Basic Validation

```typescript
import { validateUserLocalKey } from "@/validation/user-local-key";

const result = validateUserLocalKey("your-key-here");
if (result.isValid) {
  console.log("Key is valid");
} else {
  console.error("Validation error:", result.error);
}
```

### Storage Operations

```typescript
import { userLocalKeyStorage } from "@/utils/user-local-key-storage";

// Set a key
const result = userLocalKeyStorage.set("your-key");
if (result.success) {
  console.log("Key saved successfully");
}

// Get a key
const key = userLocalKeyStorage.get();

// Check if key exists and is valid
const hasValidKey = userLocalKeyStorage.hasValidKey();

// Remove a key
userLocalKeyStorage.remove();
```

### React Hook

```typescript
import { useUserLocalKey } from "@/lib/hooks/use-user-local-key";

function MyComponent() {
  const { userLocalKey, isValid, hasKey, setKey, removeKey } = useUserLocalKey();

  if (!hasKey) {
    return <div>Please set your local key in settings</div>;
  }

  return (
    <div>
      <p>Key is set and valid: {isValid ? "Yes" : "No"}</p>
      <button onClick={() => removeKey()}>Remove Key</button>
    </div>
  );
}
```

## Security Notes

- Keys are stored in localStorage (browser storage)
- Keys are not transmitted to the server unless explicitly needed
- Keys are only accessible from the same domain
- Users must manually input the key on new devices

## Error Handling

The validation provides detailed error messages for common issues:

- Empty keys
- Keys that are too long
- Keys with invalid characters
- Storage operation failures

## Integration

This feature is integrated into the Settings page (`/settings`) where users can:

1. Input their private key
2. Toggle visibility (show/hide)
3. Copy the key to clipboard
4. Download the key as a text file
5. See real-time validation feedback
