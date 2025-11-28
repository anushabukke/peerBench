# Pigeon - PubMed Data Collection and Prompt Generation Daemon

A daemon application that automatically collects data from various sources and generates educational prompts using AI models.

## Architecture Overview

The application uses a flexible abstraction pattern for defining data collection and prompt generation workflows. Each workflow is defined as a "source" that specifies:

- **Collector**: The class responsible for fetching data from a source
- **Generator**: The class responsible for creating prompts from the collected data
- **Source**: The data source URL or identifier
- **Collector Options**: Configuration specific to the collector
- **Generator Options**: Configuration specific to the generator

## Adding New Collectors

### 1. Define the Collector Class

Create a new collector class that extends the base collector interface:

```typescript
import { BaseCollector } from "peerbench";

export class ArxivCollector extends BaseCollector {
  async collect(source: string, options?: any) {
    // Implementation for collecting from arXiv
    // Return array of articles with pmid, title, paragraphs, etc.
  }
}
```

### 2. Add to GENERATORS and COLLECTORS

```typescript
const COLLECTORS = {
  pubmed: PubMedCollector,
  arxiv: ArxivCollector, // Add your new collector here
};
```

### 3. Define Collector Options

```typescript
const COLLECTOR_OPTIONS = {
  pubmed: {},
  arxiv: {
    maxResults: 100,
    category: "cs.AI",
    // Add any options your collector needs
  },
};
```

### 4. Initialize in Daemon Constructor

```typescript
constructor() {
  this.collectors = {
    pubmed: new PubMedCollector(),
    arxiv: new ArxivCollector(), // Add your new collector instance here
  };
}
```

### 5. Add Mapping in Helper Method

```typescript
private getCollectorKey(collector: any): string {
  if (collector === PubMedCollector) return 'pubmed';
  if (collector === ArxivCollector) return 'arxiv'; // Add mapping here
  return 'unknown';
}
```

## Adding New Generators

### 1. Define the Generator Class

Create a new generator class that extends the base generator interface:

```typescript
import { BaseGenerator } from "peerbench";

export class CustomGenerator extends BaseGenerator {
  async generatePrompts(data: any[], options?: any) {
    // Implementation for generating prompts
    // Return array of prompt objects
  }
}
```

### 2. Add to GENERATORS

```typescript
const GENERATORS = {
  trp: TRPGenerator,
  pubmedMCQa: AutoGenMultipleChoiceQuestionsPubmedAlpha,
  customGenerator: CustomGenerator, // Add your new generator here
};
```

### 3. Define Generator Options

```typescript
const GENERATOR_OPTIONS = {
  pubmedMCQa: {
    /* existing options */
  },
  trp: {
    /* existing options */
  },
  customGenerator: {
    type: "customGenerator" as "trp" | "pubmedMCQa" | "customGenerator",
    openRouterApiKey: process.env.OPENROUTER_API_KEY!,
    model: "google/gemini-2.0-flash-001",
    // Add any options your generator needs
    customOption: "value",
  },
};
```

### 4. Initialize in Daemon Constructor

```typescript
constructor() {
  this.generators = {
    trp: new TRPGenerator(),
    pubmedMCQa: new AutoGenMultipleChoiceQuestionsPubmedAlpha(),
    customGenerator: new CustomGenerator(), // Add your new generator instance here
  };
}
```

### 5. Add Mapping in Helper Method

```typescript
private getGeneratorKey(generator: any): string {
  if (generator === TRPGenerator) return 'trp';
  if (generator === AutoGenMultipleChoiceQuestionsPubmedAlpha) return 'pubmedMCQa';
  if (generator === CustomGenerator) return 'customGenerator'; // Add mapping here
  return 'unknown';
}
```

## Adding New Data Sources

### 1. Define Source Configuration

Add a new source to the `CONFIG.sources` array:

```typescript
const CONFIG = {
  sources: [
    // Existing sources...
    {
      collector: COLLECTORS.arxiv, // Use your new collector
      generator: GENERATORS.customGenerator, // Use your new generator
      source: "https://arxiv.org/rss/cs.AI", // Your data source
      collectorOptions: COLLECTOR_OPTIONS.arxiv, // Collector-specific options
      generatorOptions: GENERATOR_OPTIONS.customGenerator, // Generator-specific options
    },
  ],
  // ... rest of config
};
```

### 2. Source Configuration Structure

Each source object contains:

```typescript
{
  collector: COLLECTORS.pubmed,           // Collector class reference
  generator: GENERATORS.pubmedMCQa,       // Generator class reference
  source: "https://pubmed.ncbi.nlm.nih.gov/rss/...", // Data source URL
  collectorOptions: COLLECTOR_OPTIONS.pubmed,        // Collector options
  generatorOptions: GENERATOR_OPTIONS.pubmedMCQa,    // Generator options
}
```

## Example: Complete New Workflow

Here's how to add a complete new workflow for arXiv papers:

```typescript
// 1. Import your new classes
import { ArxivCollector, CustomGenerator } from './custom';

// 2. Add to collections
const COLLECTORS = {
  pubmed: PubMedCollector,
  arxiv: ArxivCollector,
};

const GENERATORS = {
  trp: TRPGenerator,
  pubmedMCQa: AutoGenMultipleChoiceQuestionsPubmedAlpha,
  customGenerator: CustomGenerator,
};

// 3. Define options
const COLLECTOR_OPTIONS = {
  pubmed: {},
  arxiv: {
    maxResults: 50,
    category: "cs.AI",
  },
};

const GENERATOR_OPTIONS = {
  // ... existing options
  customGenerator: {
    type: "customGenerator" as "trp" | "pubmedMCQa" | "customGenerator",
    openRouterApiKey: process.env.OPENROUTER_API_KEY!,
    model: "google/gemini-2.0-flash-001",
    customOption: "value",
  },
};

// 4. Add source
const CONFIG = {
  sources: [
    // ... existing sources
    {
      collector: COLLECTORS.arxiv,
      generator: GENERATORS.customGenerator,
      source: "https://arxiv.org/rss/cs.AI",
      collectorOptions: COLLECTOR_OPTIONS.arxiv,
      generatorOptions: GENERATOR_OPTIONS.customGenerator,
    },
  ],
  // ... rest of config
};

// 5. Initialize in daemon
constructor() {
  this.collectors = {
    pubmed: new PubMedCollector(),
    arxiv: new ArxivCollector(),
  };

  this.generators = {
    trp: new TRPGenerator(),
    pubmedMCQa: new AutoGenMultipleChoiceQuestionsPubmedAlpha(),
    customGenerator: new CustomGenerator(),
  };
}

// 6. Add mappings
private getCollectorKey(collector: any): string {
  if (collector === PubMedCollector) return 'pubmed';
  if (collector === ArxivCollector) return 'arxiv';
  return 'unknown';
}

private getGeneratorKey(generator: any): string {
  if (generator === TRPGenerator) return 'trp';
  if (generator === AutoGenMultipleChoiceQuestionsPubmedAlpha) return 'pubmedMCQa';
  if (generator === CustomGenerator) return 'customGenerator';
  return 'unknown';
}
```

## Benefits of This Abstraction

1. **Separation of Concerns**: Collectors handle data fetching, generators handle prompt creation
2. **Easy Extension**: Add new data sources or prompt types without modifying core logic
3. **Configuration-Driven**: Define workflows through configuration rather than code changes
4. **Reusable Components**: Mix and match collectors and generators as needed
5. **Type Safety**: TypeScript ensures proper configuration structure
6. **Maintainable**: Clear structure makes it easy to understand and modify

## Logging

The application uses Pino for structured logging with colored, formatted output for better readability and debugging.

### **Configuration**

```typescript
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      messageFormat: "{time} {level} {msg}",
    },
  },
});
```

### **Log Format**

Logs are now output in a clean, readable format:

- **Timestamp**: Human-readable time format
- **Level**: Colored log level (INFO, WARN, ERROR, FATAL)
- **Message**: Descriptive message with embedded information

### **Example Output**

```bash
# Before (metadata format)
[12:34:56.789] INFO  (12345) {"articleCount":25} Collected articles total

# After (embedded format)
[12:34:56.789] INFO  Collected 25 articles total
[12:34:56.790] INFO  Found 15 new articles to process
[12:34:56.791] INFO  Generated 45 prompts
[12:34:56.792] INFO  Saved 45 prompts to file with hash abc123 (pubmed/pubmedMCQa)
[12:34:56.793] INFO  Uploaded 45/45 prompts to peerBench
```

### **Log Levels**

- **fatal**: Critical errors that cause application shutdown
- **error**: Errors that don't stop the application
- **warn**: Warning conditions
- **info**: General information about application flow
- **debug**: Detailed debugging information
- **trace**: Very detailed debugging information

### **Information Embedding**

Instead of using metadata objects, information is now embedded directly in the message:

```typescript
// Before (metadata format)
logger.info({ articleCount: 25 }, "Collected articles total");

// After (embedded format)
logger.info(`Collected ${collectedData.length} articles total`);
```

### **Benefits**

- **Readable**: Clean, human-readable log output
- **Colored**: Visual distinction between log levels
- **Informative**: All relevant information in the message
- **Consistent**: Uniform format across all log statements
- **Debuggable**: Easy to scan and understand logs

### **Environment Variables**

- `LOG_LEVEL`: Set the minimum log level (default: "info")

## Running the Application

```bash
# Install dependencies
npm install

# Set environment variables
export OPENROUTER_API_KEY="your-api-key-here"
export LOG_LEVEL="info"  # Optional: debug, info, warn, error, fatal

# Run the daemon
npm run dev
```

The daemon will automatically:

1. Collect data from all configured sources
2. Generate prompts using the specified generators
3. Save prompts to files in the `data/prompts/` directory
4. Upload prompts to PeerBench
5. Track processed data using prompt files to avoid duplicates
6. Run on the configured interval (default: every 6 hours)

## Data Storage

The daemon creates a `data/` directory in the current working directory with:

- `prompts/`: Directory containing generated prompts
  - `<hash>.<collector>.<generator>.prompts.json`: Each file contains prompts generated from a specific batch of collected data
  - The hash is calculated using `stableStringify` for consistent data representation
  - The collector and generator keys are included to distinguish between different processing pipelines
  - Example: `abc123.pubmed.trp.prompts.json` for PubMed data processed with TRP generator

## How Duplicate Detection Works

The system now uses a more robust duplicate detection mechanism:

1. **Data Collection**: Collects data from all configured sources
2. **Data Hashing**: Creates a stable hash of the collected data using `stableStringify`
3. **Pipeline Identification**: Identifies the collector and generator being used for processing
4. **Prompt File Check**: Looks for existing prompt files with the same hash, collector, and generator combination
5. **Skip if Processed**: If a prompt file exists for the same data + pipeline, the data is considered already processed
6. **Generate and Save**: If no prompt file exists, generates prompts and saves them to `<hash>.<collector>.<generator>.prompts.json`

This approach ensures that:

- The same data won't be processed multiple times with the same pipeline
- Different collectors or generators can process the same data independently
- Prompts are preserved locally for reference with clear pipeline identification
- The system can resume from where it left off after restarts
- Multiple processing strategies can be applied to the same data source

## Data Format Handling

The system now safely handles different data formats that collectors might return:

### **Supported Data Formats**

- **Arrays**: `[item1, item2, item3]` → processed directly
- **Single Objects**: `{ title: "...", content: "..." }` → wrapped in array
- **Null/Undefined**: → skipped gracefully with warning
- **Primitive Values**: `"text"` → wrapped in array

### **Data Normalization**

The `normalizeDataToArray()` method ensures consistent data processing:

```typescript
private normalizeDataToArray(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return [data];
  }
  return [];
}
```

### **Benefits**

- **Robust**: Handles unexpected data formats without crashing
- **Flexible**: Supports various collector implementations
- **Consistent**: Always provides arrays to generators
- **Safe**: Gracefully handles edge cases with proper logging

## Unique File Generation

### **Source-Specific Hash Calculation**

Each source configuration now generates unique files even when using the same data source:

```typescript
private hashCollectedData(data: any[]): string {
  // Include source-specific information in the hash to ensure uniqueness
const sourceInfo = data[0]?.sourceConfig;
const sourceIdentifier = `${sourceInfo?.id || 'unknown'}-${this.getCollectorKey(sourceInfo?.collector)}-${this.getGeneratorKey(sourceInfo?.generator)}`;

  const stableData = stableStringify(data) || JSON.stringify(data);
  const combinedData = `${sourceIdentifier}-${stableData}`;

  return createHash("sha256").update(combinedData, "utf8").digest("hex");
}
```

### **How It Works**

1. **Source Identification**: Each source has a unique ID and collector/generator combination
2. **Hash Calculation**: Combines source identifier with data content for unique hashing
3. **File Naming**: Results in unique file names for each source configuration
4. **No Conflicts**: Same data source can be processed by multiple source configurations independently

### **Example Configuration**

```typescript
const CONFIG = {
  sources: [
    {
      id: "pubmed-mcq-1", // Unique identifier
      collector: COLLECTORS.pubmed,
      generator: GENERATORS.pubmedMCQa,
      source: "https://pubmed.ncbi.nlm.nih.gov/rss/...",
    },
    {
      id: "pubmed-trp-1", // Different unique identifier
      collector: COLLECTORS.pubmed,
      generator: GENERATORS.trp,
      source: "https://pubmed.ncbi.nlm.nih.gov/rss/...", // Same source
    },
  ],
};
```

### **Result**

- **Source 1**: Generates `hash1.pubmed.pubmedMCQa.prompts.json`
- **Source 2**: Generates `hash2.pubmed.trp.prompts.json`
- **No conflicts**: Each source processes independently and generates unique files
