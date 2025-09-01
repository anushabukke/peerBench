"use client";

import { useState, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import Image from "next/image";

interface KeysSectionProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  nearAiToken: string;
  setNearAiToken: (token: string) => void;
  onSave: () => void;
  isLoading: boolean;
}

export default function KeysSection({
  apiKey,
  setApiKey,
  nearAiToken,
  setNearAiToken,
  onSave,
  isLoading,
}: KeysSectionProps) {
  const [nearAiConfigFile, setNearAiConfigFile] = useState<File | null>(null);

  const handleNearAiConfigUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNearAiConfigFile(file);
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (obj && obj.auth) {
        const authString = JSON.stringify(obj.auth);
        setNearAiToken(authString);
        toast.success("Near AI auth token loaded from config file");
      } else {
        toast.error("Invalid config file: missing 'auth' property");
        setNearAiConfigFile(null);
      }
    } catch {
      setNearAiConfigFile(null);
      toast.error("Failed to parse the given Near AI config file");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys & Authentication</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* OpenRouter API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              <span className="flex items-center gap-2">
                <Image
                  src="/openrouter.svg"
                  alt="OpenRouter"
                  width={24}
                  height={24}
                />
                OpenRouter API Key
              </span>
            </label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setApiKey(e.target.value)
              }
              placeholder="Enter your OpenRouter API key"
              className="max-w-md"
              autoComplete="off"
              data-form-type="other"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Your API key will be stored in your browser&apos;s localStorage.
            </p>
          </div>

          {/* Near AI Auth */}
          <div>
            <label
              htmlFor="nearAiToken"
              className="block text-sm font-medium mb-2"
            >
              <span className="flex items-center gap-2">
                <Image src="/nearai.png" alt="Near AI" width={24} height={24} />
                Near AI Auth
              </span>
            </label>

            <div className="items-center flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  document.getElementById("nearai-config-upload")?.click()
                }
                className="border-gray-300"
                size="default"
                title="Upload Near AI config JSON"
              >
                Upload Near AI config JSON
                <input
                  id="nearai-config-upload"
                  type="file"
                  accept="application/json"
                  onChange={handleNearAiConfigUpload}
                  className="hidden"
                  title="Select config.json from ~/.nearai directory"
                  autoComplete="off"
                />
              </Button>
              <div className="text-sm text-muted-foreground">
                {nearAiToken || nearAiConfigFile
                  ? nearAiConfigFile?.name || "Set"
                  : "Not set"}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Your config file is available under ~/.nearai/config.json after
              you&apos;ve run &quot;nearai login&quot; command
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={isLoading}
            variant="default"
            size="default"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
