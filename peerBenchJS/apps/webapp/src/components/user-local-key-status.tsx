"use client";

import { useUserLocalKey } from "@/lib/hooks/use-user-local-key";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Key } from "lucide-react";

interface UserLocalKeyStatusProps {
  showActions?: boolean;
  compact?: boolean;
}

export function UserLocalKeyStatus({ showActions = true, compact = false }: UserLocalKeyStatusProps) {
  const { userLocalKey, isValid, isLoading, hasKey, removeKey } = useUserLocalKey();

  if (isLoading) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardContent className={compact ? "p-2" : "p-6"}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            Loading key status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasKey) {
    return (
      <Card className={compact ? "p-3" : ""}>
        <CardHeader className={compact ? "p-2 pb-2" : "p-6 pb-4"}>
          <CardTitle className={compact ? "text-sm" : "text-lg"}>
            <span className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Local Key Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "p-2 pt-0" : "p-6 pt-0"}>
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            No local key configured
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure your data authenticity certifying private key in settings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-3" : ""}>
      <CardHeader className={compact ? "p-2 pb-2" : "p-6 pb-4"}>
        <CardTitle className={compact ? "text-sm" : "text-lg"}>
          <span className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Local Key Status
            {isValid && <CheckCircle className="h-4 w-4 text-green-600" />}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "p-2 pt-0" : "p-6 pt-0"}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Status:</span>
            <span className={isValid ? "text-green-600" : "text-red-600"}>
              {isValid ? "Valid" : "Invalid"}
            </span>
          </div>
          
          {!compact && (
            <div className="text-xs text-muted-foreground">
              Key length: {userLocalKey?.length || 0} characters
            </div>
          )}

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={removeKey}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove Key
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
