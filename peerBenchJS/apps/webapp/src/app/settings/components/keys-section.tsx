"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { OpenRouterProvider } from "@peerbench/sdk";
import { toast } from "react-toastify";
import Image from "next/image";
import { useApiKeyApi } from "@/lib/hooks/use-apikey-api";
import { ApiKeyProviders } from "@/database/types";

interface KeysSectionProps {
  activeKey: string;
  apiKey: string;
  setApiKey: (key: string) => void;
  onSave: (newApiKey?: string) => void;
  isLoading: boolean;
}

export default function KeysSection({
  activeKey,
  apiKey,
  setApiKey,
  onSave,
  isLoading,
}: KeysSectionProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [serverKey, setServerKey] = useState<string | null>(null);
  const [showServerKeyOption, setShowServerKeyOption] = useState(false);
  const { getApiKey } = useApiKeyApi();

  // Check for server-side API key on component mount
  useEffect(() => {
    const checkServerKey = async () => {
      try {
        const result = await getApiKey(ApiKeyProviders.openrouter);
        if (result?.key) {
          setServerKey(result.key);
          // Show server key option only if it's different from the current active key
          if (result.key !== activeKey) {
            setShowServerKeyOption(true);
          }
        }
      } catch {
        // Server key doesn't exist or error occurred - this is normal
        console.log("No server-side API key found");
      }
    };

    checkServerKey();
  }, []);

  const handleUseServerKey = async () => {
    if (serverKey) {
      setApiKey(serverKey);
      setShowServerKeyOption(false);
      // Automatically save the changes
      await onSave(serverKey);
    }
  };

  const handleCheckOpenRouterKey = async () => {
    setIsChecking(true);
    const result = await new OpenRouterProvider({ apiKey })
      .validateApiKey()
      .then(() => true)
      .catch(() => false);
    setIsChecking(false);

    if (result) {
      toast.success("API key is valid");
    } else {
      toast.error("Invalid API key");
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
            {activeKey && (
              <p className="text-sm font-bold text-green-600 my-2">
                Current active key is ending with ...{activeKey.slice(-6)}
              </p>
            )}

            {/* Server Key Option */}
            {showServerKeyOption && serverKey && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg my-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Auto generated API key available
                    </p>
                    <p className="text-xs text-blue-600">
                      This key is auto generated for your account. Ending with
                      ...{serverKey.slice(-6)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseServerKey}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                    >
                      Use Auto Generated Key
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowServerKeyOption(false)}
                      className="text-gray-500"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setApiKey(e.target.value)
                }
                placeholder="Enter your new OpenRouter API key"
                className="max-w-md"
                autoComplete="off"
                data-form-type="other"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckOpenRouterKey}
                disabled={isChecking}
              >
                {isChecking ? "Checking..." : "Check"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Your API key will be stored in your browser&apos;s localStorage.
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={() => onSave(apiKey)}
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
