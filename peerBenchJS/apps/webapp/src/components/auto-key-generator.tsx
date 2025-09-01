"use client";

import { useEffect, useState, useRef } from "react";
import { getUser } from "@/lib/actions/auth";
import { generatePrivateKey } from "viem/accounts";
import { privateKeyToAccount } from "viem/accounts";
import {
  signUserUuidWithPrivateKey,
  storeUserKey,
} from "@/services/key.service";
import { userLocalKeyStorage } from "@/utils/user-local-key-storage";
import { toast } from "react-toastify";

export default function AutoKeyGenerator() {
  const [, setIsGenerating] = useState(false);
  const hasRunRef = useRef<Set<string>>(new Set());
  const isRunningRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const checkAndGenerateKey = async () => {
      // Prevent multiple simultaneous executions
      if (isRunningRef.current || !isMounted) {
        return;
      }
      isRunningRef.current = true;

      try {
        // Check if user is authenticated
        const currentUser = await getUser();

        // If no user, don't proceed
        if (!currentUser?.id) {
          isRunningRef.current = false;
          return;
        }

        // Check if we've already processed this user in this session
        if (hasRunRef.current.has(currentUser.id)) {
          console.log(
            "AutoKeyGenerator: Already processed user",
            currentUser.id
          );
          isRunningRef.current = false;
          return;
        }

        console.log("AutoKeyGenerator: Processing new user", currentUser.id);

        // Check if device already has a local key
        const existingKey = userLocalKeyStorage.get();

        if (existingKey) {
          // Key exists, validate it and upload to database
          try {
            const account = privateKeyToAccount(existingKey as `0x${string}`);
            const publicKey = account.address;

            // Sign and upload to database (don't check if it exists first)
            const signingResult = await signUserUuidWithPrivateKey(
              currentUser.id,
              existingKey
            );

            if (signingResult.success && signingResult.signature) {
              const storeResult = await storeUserKey({
                publicKey,
                keyType: "secp256k1n",
                userUuid: currentUser.id,
                keySigningUuid: signingResult.signature,
              });

              if (storeResult.success) {
                console.log("Existing key successfully uploaded to database");
              } else if (storeResult.isDuplicate) {
                console.log("Key already exists in database");
              } else {
                console.warn(
                  "Failed to upload existing key to database:",
                  storeResult.error
                );
              }
            }
          } catch (error) {
            console.warn(
              "Existing key validation failed, will generate new one:",
              error
            );
            // Fall through to generate new key
          }
        }

        // If no key exists or validation failed, generate a new one
        if (!existingKey || !userLocalKeyStorage.hasValidKey()) {
          setIsGenerating(true);

          const newPrivateKey = generatePrivateKey();
          const result = userLocalKeyStorage.set(newPrivateKey);

          if (result.success) {
            // Derive public key
            const account = privateKeyToAccount(newPrivateKey);
            const publicKey = account.address;

            // Sign and upload to database
            const signingResult = await signUserUuidWithPrivateKey(
              currentUser.id,
              newPrivateKey
            );

            if (signingResult.success && signingResult.signature) {
              const storeResult = await storeUserKey({
                publicKey,
                keyType: "secp256k1n",
                userUuid: currentUser.id,
                keySigningUuid: signingResult.signature,
              });

              if (storeResult.success) {
                toast.success(
                  "New private key generated and stored successfully"
                );
                console.log("New key generated and uploaded:", { publicKey });
              } else if (storeResult.isDuplicate) {
                toast.warning("Key already exists in database");
              } else {
                toast.warning("Key generated but failed to upload to database");
              }
            } else {
              toast.warning("Key generated but failed to sign user UUID");
            }
          } else {
            toast.error("Failed to save generated key");
          }
        }

        // Mark this user as processed
        hasRunRef.current.add(currentUser.id);
        console.log(
          "AutoKeyGenerator: Completed processing for user",
          currentUser.id
        );
      } catch (error) {
        console.error("Auto key generation failed:", error);
        toast.error("Failed to generate private key");
      } finally {
        if (isMounted) {
          setIsGenerating(false);
          isRunningRef.current = false;
        }
      }
    };

    // Only run once when component mounts
    checkAndGenerateKey();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  // This component doesn't render anything visible
  return null;
}
