"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  Download,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Bug,
  RefreshCw,
  Trash2,
  Globe,
  Github,
  MessageCircle,
} from "lucide-react";
import KeysSection from "./components/keys-section";
import { validateUserLocalKey } from "@/validation/user-local-key";
import { userLocalKeyStorage } from "@/utils/user-local-key-storage";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { useSearchParams } from "next/navigation";
import { getUser } from "@/lib/actions/auth";
import {
  storeUserKey,
  signUserUuidWithPrivateKey,
  getUserKeys,
  deleteUserKeyById,
} from "@/services/key.service";
import { OrganizationClientService } from "@/services/organization.client";
import {
  isUserAffiliatedWithOrg,
  addUserToOrg,
} from "@/services/org-people.service";

export const fetchCache = "force-no-store";

interface StoredKey {
  id: number;
  publicKey: string;
  keyType: string;
  userUuid: string;
  keySigningUuid: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    source?: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const isDebugMode = searchParams.get("debug") === "1";

  const [apiKey, setApiKey] = useState("");
  const [nearAiToken, setNearAiToken] = useState("");

  const [userLocalKey, setUserLocalKey] = useState("");
  const [showUserLocalKey, setShowUserLocalKey] = useState(false);
  const [userLocalKeyError, setUserLocalKeyError] = useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Organization-related state
  const [organization, setOrganization] = useState<any>(null);
  const [isLookingUpOrg, setIsLookingUpOrg] = useState(false);
  const [isAffiliated, setIsAffiliated] = useState(false);
  const [isCheckingAffiliation, setIsCheckingAffiliation] = useState(false);
  const [isAddingAffiliation, setIsAddingAffiliation] = useState(false);

  // User profile state
  const [profile, setProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    // Load current user
    const loadUser = async () => {
      const user = await getUser();
      setCurrentUser(user);
    };
    loadUser();

    // Load user profile
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await fetch("/api/v1/profile");
        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();

    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem("openrouter_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    // Load saved Near AI token from localStorage
    const savedNearAiToken = localStorage.getItem("nearai_auth_token");
    if (savedNearAiToken) {
      setNearAiToken(savedNearAiToken);
    }
    // Load saved user local key from localStorage only in debug mode
    if (isDebugMode) {
      const savedUserLocalKey = userLocalKeyStorage.get();
      if (savedUserLocalKey) {
        setUserLocalKey(savedUserLocalKey);
        validateAndSetPublicKey(savedUserLocalKey);
      }
      // Load stored keys from database
      loadStoredKeys();
    }

    // Look up organization for current user's email
    if (currentUser?.email) {
      lookupOrganization(currentUser.email);
    }
  }, [isDebugMode, currentUser?.email]);

  // Load stored keys when currentUser is available and in debug mode
  useEffect(() => {
    if (isDebugMode && currentUser?.id) {
      loadStoredKeys();
    }
  }, [isDebugMode, currentUser?.id]);

  const lookupOrganization = async (email: string) => {
    if (!email || !email.includes("@")) {
      setOrganization(null);
      return;
    }

    setIsLookingUpOrg(true);
    try {
      const result = await OrganizationClientService.lookupByEmail(email);

      if (result.found && result.organization) {
        setOrganization(result.organization);
        // Check if user is already affiliated
        if (currentUser?.id) {
          checkAffiliationStatus(result.organization.id, currentUser.id);
        }
      } else {
        setOrganization(null);
        setIsAffiliated(false);
      }
    } catch (error) {
      console.error("Error looking up organization:", error);
      setOrganization(null);
      setIsAffiliated(false);
    } finally {
      setIsLookingUpOrg(false);
    }
  };

  const checkAffiliationStatus = async (orgId: number, userId: string) => {
    setIsCheckingAffiliation(true);
    try {
      const result = await isUserAffiliatedWithOrg({ orgId, userId });
      if (result.success) {
        setIsAffiliated(result.isAffiliated || false);
      }
    } catch (error) {
      console.error("Error checking affiliation:", error);
    } finally {
      setIsCheckingAffiliation(false);
    }
  };

  const addAffiliation = async () => {
    if (!currentUser?.id || !organization) return;

    setIsAddingAffiliation(true);
    try {
      const result = await addUserToOrg({
        orgId: organization.id,
        userId: currentUser.id,
      });

      if (result.success) {
        setIsAffiliated(true);
        toast.success("Successfully affiliated with organization!");
      } else if (result.isDuplicate) {
        toast.warning(result.error);
        setIsAffiliated(true);
      } else {
        toast.error(result.error || "Failed to add affiliation");
      }
    } catch (error) {
      console.error("Error adding affiliation:", error);
      toast.error("Failed to add affiliation");
    } finally {
      setIsAddingAffiliation(false);
    }
  };

  const loadStoredKeys = async () => {
    if (!currentUser?.id) return;

    setIsLoadingKeys(true);
    try {
      const result = await getUserKeys(currentUser.id);
      if (result.success) {
        setStoredKeys(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load stored keys:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const generateNewPrivateKey = async () => {
    if (!currentUser?.id) {
      toast.error("User not authenticated");
      return;
    }

    setIsGeneratingKey(true);
    try {
      const newPrivateKey = generatePrivateKey();
      const result = userLocalKeyStorage.set(newPrivateKey);

      if (result.success) {
        setUserLocalKey(newPrivateKey);
        const publicKeyResult = validateAndSetPublicKey(newPrivateKey);

        if (publicKeyResult && publicKeyResult.publicKey && currentUser?.id) {
          const userId = currentUser.id;
          // Sign the user UUID and store in database
          const signingResult = await signUserUuidWithPrivateKey(
            userId,
            newPrivateKey
          );

          if (signingResult.success && signingResult.signature) {
            const storeResult = await storeUserKey({
              publicKey: publicKeyResult.publicKey,
              keyType: "secp256k1n",
              userUuid: userId,
              keySigningUuid: signingResult.signature,
            });

            if (storeResult.success) {
              toast.success(
                "New private key generated and stored successfully"
              );
              // Reload stored keys to show the new one
              await loadStoredKeys();
            } else if (storeResult.isDuplicate) {
              toast.warning(storeResult.error);
            } else {
              toast.warning("Key generated but failed to store in database");
            }
          } else {
            toast.warning("Key generated but failed to sign user UUID");
          }
        }
      } else {
        toast.error("Failed to save generated key");
      }
    } catch {
      toast.error("Failed to generate new private key");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const validateAndSetPublicKey = (privateKey: string) => {
    try {
      // Remove 0x prefix if present for VIEM
      const cleanKey = privateKey.startsWith("0x")
        ? privateKey
        : `0x${privateKey}`;
      const account = privateKeyToAccount(cleanKey as `0x${string}`);
      setPublicKey(account.address);
      setUserLocalKeyError(null);
      return { success: true, publicKey: account.address };
    } catch {
      setPublicKey(null);
      setUserLocalKeyError("Invalid private key format");
      return { success: false, publicKey: null };
    }
  };

  const handleUserLocalKeyChange = async (value: string) => {
    setUserLocalKey(value);

    // Clear error when user starts typing
    if (userLocalKeyError) {
      setUserLocalKeyError(null);
    }

    // Save to localStorage immediately if valid
    if (value.trim()) {
      const result = userLocalKeyStorage.set(value);
      if (!result.success) {
        setUserLocalKeyError(result.error || "Failed to save key");
      } else {
        // Validate with VIEM and set public key
        const validationResult = validateAndSetPublicKey(value);

        // If we have a valid public key and user, store in database
        if (
          validationResult.success &&
          validationResult.publicKey &&
          currentUser?.id
        ) {
          const userId = currentUser.id;
          const signingResult = await signUserUuidWithPrivateKey(userId, value);

          if (signingResult.success && signingResult.signature) {
            const storeResult = await storeUserKey({
              publicKey: validationResult.publicKey,
              keyType: "secp256k1n",
              userUuid: userId,
              keySigningUuid: signingResult.signature,
            });

            if (storeResult.success) {
              toast.success("Key stored successfully");
              await loadStoredKeys();
            } else if (storeResult.isDuplicate) {
              toast.warning(storeResult.error);
            } else {
              console.warn(
                "Failed to store key in database:",
                storeResult.error
              );
            }
          }
        }
      }
    } else {
      userLocalKeyStorage.remove();
      setPublicKey(null);
    }
  };

  const handleUserLocalKeyBlur = () => {
    if (userLocalKey.trim()) {
      const validation = validateUserLocalKey(userLocalKey);
      if (!validation.isValid) {
        setUserLocalKeyError(validation.error || "Invalid key format");
      } else {
        setUserLocalKeyError(null);
        // Validate with VIEM and set public key
        validateAndSetPublicKey(userLocalKey);
      }
    }
  };

  const copyUserLocalKey = async () => {
    if (!userLocalKey) {
      toast.error("No key to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(userLocalKey);
      toast.success("Key copied to clipboard");
    } catch {
      toast.error("Failed to copy key");
    }
  };

  const downloadUserLocalKey = () => {
    if (!userLocalKey) {
      toast.error("No key to copy");
      return;
    }

    const blob = new Blob([userLocalKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-local-key.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Key downloaded successfully");
  };

  const deleteStoredKey = async (keyId: number) => {
    if (!currentUser?.id) return;

    try {
      const result = await deleteUserKeyById(keyId, currentUser.id);
      if (result.success) {
        toast.success("Key deleted successfully");
        await loadStoredKeys();
      } else {
        toast.error(result.error || "Failed to delete key");
      }
    } catch (error) {
      toast.error("Failed to delete key");
      console.error(error);
    }
  };

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage("");

    const formData = new FormData(e.currentTarget);
    const profileData = {
      displayName: (formData.get("displayName") as string) || null,
      github: (formData.get("github") as string) || null,
      website: (formData.get("website") as string) || null,
      bluesky: (formData.get("bluesky") as string) || null,
      mastodon: (formData.get("mastodon") as string) || null,
      twitter: (formData.get("twitter") as string) || null,
    };

    try {
      const response = await fetch("/api/v1/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setProfileMessage("Profile updated successfully!");
        toast.success("Profile updated successfully!");
      } else {
        setProfileMessage("Failed to update profile");
        toast.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setProfileMessage("Error updating profile");
      toast.error("Error updating profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save API key to localStorage
      localStorage.setItem("openrouter_api_key", apiKey);

      // Save Near AI token to localStorage
      localStorage.setItem("nearai_auth_token", nearAiToken);

      // Validate user local key only in debug mode
      if (isDebugMode && userLocalKey.trim()) {
        const validation = validateUserLocalKey(userLocalKey);
        if (!validation.isValid) {
          toast.error(`Invalid user local key: ${validation.error}`);
          setIsLoading(false);
          return;
        }
      }

      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-8">
      {/* User Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="text-center py-4">Loading profile...</div>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-4">
              {/* User Email and Organization Affiliation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Email (Read-only) */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={currentUser?.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
                  />
                </div>

                {/* Organization Affiliation */}
                {organization && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Organization Affiliation
                    </label>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-800">
                        {organization.name}
                      </p>
                      {organization.country && (
                        <p className="text-xs text-blue-600">
                          {organization.country}
                          {organization.alpha_two_code &&
                            ` (${organization.alpha_two_code})`}
                        </p>
                      )}
                      {organization.web_page && (
                        <p className="text-xs text-blue-600">
                          <a
                            href={organization.web_page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {organization.web_page}
                          </a>
                        </p>
                      )}

                      <div className="pt-2">
                        {isCheckingAffiliation ? (
                          <div className="text-sm text-gray-500">
                            Checking affiliation status...
                          </div>
                        ) : isAffiliated ? (
                          <div className="flex items-center text-sm text-green-600">
                            <svg
                              className="h-4 w-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            You are affiliated with this organization
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={addAffiliation}
                              disabled={isAddingAffiliation}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              {isAddingAffiliation
                                ? "Adding..."
                                : "Confirm Affiliation"}
                            </Button>
                            <p className="text-sm text-gray-600">
                              Click to confirm you are affiliated with this
                              organization
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization Lookup Loading */}
                {isLookingUpOrg && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Affiliation
                    </label>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Looking up your organization...
                    </div>
                  </div>
                )}
              </div>

              {/* User UUID (Read-only) */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID (UUID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentUser?.id || ""}
                    disabled
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentUser?.id) {
                        navigator.clipboard.writeText(currentUser.id);
                        toast.success("UUID copied to clipboard");
                      }
                    }}
                    disabled={!currentUser?.id}
                    title="Copy UUID to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Unique identifier for your account
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <Input
                  name="displayName"
                  type="text"
                  defaultValue={profile?.displayName || ""}
                  placeholder="Enter your display name"
                  className="max-w-md"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </label>
                <Input
                  name="website"
                  type="url"
                  defaultValue={profile?.website || ""}
                  placeholder="https://yourwebsite.com"
                  className="max-w-md"
                />
              </div>

              {/* GitHub */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  GitHub
                </label>
                <Input
                  name="github"
                  type="url"
                  defaultValue={profile?.github || ""}
                  placeholder="https://github.com/username"
                  className="max-w-md"
                />
              </div>

              {/* Social Media Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Social Media
                </h3>

                {/* Bluesky */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Bluesky
                  </label>
                  <Input
                    name="bluesky"
                    type="text"
                    defaultValue={profile?.bluesky || ""}
                    placeholder="@username.bsky.social"
                    className="max-w-md"
                  />
                </div>

                {/* Mastodon */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Mastodon
                  </label>
                  <Input
                    name="mastodon"
                    type="text"
                    defaultValue={profile?.mastodon || ""}
                    placeholder="@username@mastodon.social"
                    className="max-w-md"
                  />
                </div>

                {/* Twitter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Twitter
                  </label>
                  <Input
                    name="twitter"
                    type="text"
                    defaultValue={profile?.twitter || ""}
                    placeholder="@username"
                    className="max-w-md"
                  />
                </div>
              </div>

              {/* Profile Message */}
              {profileMessage && (
                <div
                  className={`p-3 rounded-md ${
                    profileMessage.includes("successfully")
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {profileMessage}
                </div>
              )}

              {/* Profile Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  variant="default"
                  size="default"
                >
                  {isSavingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Click below to change your password.
            </p>
            <Button
              onClick={() => window.open("/reset-password", "_blank")}
              variant="outline"
              size="default"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys & Authentication Section */}
      <KeysSection
        apiKey={apiKey}
        setApiKey={setApiKey}
        nearAiToken={nearAiToken}
        setNearAiToken={setNearAiToken}
        onSave={handleSave}
        isLoading={isLoading}
      />

      {/* Private Key Section - Only visible in debug mode */}
      {isDebugMode && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Data Authenticity Certifying Private Key</span>
              <span className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <Bug className="h-4 w-4" />
                Debug Mode
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="userLocalKey"
                  className="block text-sm font-medium"
                >
                  Private Key
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateNewPrivateKey}
                  disabled={isGeneratingKey || !currentUser?.id}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Generate new private key"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isGeneratingKey ? "animate-spin" : ""}`}
                  />
                  {isGeneratingKey ? "Generating..." : "Generate New"}
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2 max-w-md">
                  <div className="relative flex-1">
                    <Input
                      id="userLocalKey"
                      type={showUserLocalKey ? "text" : "password"}
                      value={userLocalKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleUserLocalKeyChange(e.target.value)
                      }
                      onBlur={handleUserLocalKeyBlur}
                      placeholder="Enter your private key"
                      className={`pr-12 ${userLocalKeyError ? "border-red-500 focus:border-red-500" : ""}`}
                      autoComplete="off"
                      data-form-type="other"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowUserLocalKey(!showUserLocalKey)}
                    >
                      {showUserLocalKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyUserLocalKey}
                    disabled={!userLocalKey || !!userLocalKeyError}
                    title="Copy key to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={downloadUserLocalKey}
                    disabled={!userLocalKey || !!userLocalKeyError}
                    title="Download key as file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>

                {/* Public Key Display */}
                {publicKey && (
                  <div className="max-w-md">
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Account Address:</span>
                      <span className="font-mono text-xs break-all">
                        {publicKey}
                      </span>
                    </div>
                  </div>
                )}

                {userLocalKeyError && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {userLocalKeyError}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This key is only used locally and stored on this device. On new
                devices, you will need to upload it again or create a new one.
                {!userLocalKey &&
                  " A new key will be automatically generated for you."}
              </p>

              {/* Stored Keys List */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3">Your Stored Keys</h3>
                {isLoadingKeys ? (
                  <div className="text-sm text-muted-foreground">
                    Loading keys...
                  </div>
                ) : storedKeys.length > 0 ? (
                  <div className="space-y-2">
                    {storedKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-green-600" />
                            <span className="font-mono text-xs break-all">
                              {key.publicKey}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Type: {key.keyType} • Created:{" "}
                            {new Date(key.createdAt).toLocaleDateString()}
                            {key.metadata && (
                              <>
                                <br />
                                IP: {key.metadata.ipAddress || "unknown"} •
                                Device:{" "}
                                {key.metadata.userAgent
                                  ? key.metadata.userAgent.substring(0, 50) +
                                    "..."
                                  : "unknown"}
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStoredKey(key.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete this key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No keys stored yet. Generate a new key to get started.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
