// Example settings page component - you can adapt this for your app

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Form validation schema
const profileSchema = yup.object({
  displayName: yup.string().max(100, 'Display name must be less than 100 characters'),
  github: yup.string().url('Must be a valid URL').max(200),
  website: yup.string().url('Must be a valid URL').max(200),
  bluesky: yup.string().max(100),
  mastodon: yup.string().max(100),
  twitter: yup.string().max(100),
});

type ProfileFormData = yup.InferType<typeof profileSchema>;

interface UserProfile {
  id: number;
  userId: string;
  displayName: string | null;
  github: string | null;
  website: string | null;
  bluesky: string | null;
  mastodon: string | null;
  twitter: string | null;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    mode: 'onChange',
  });

  // Load user profile and email
  useEffect(() => {
    async function loadProfile() {
      try {
        // You'll need to implement these API endpoints
        const [profileRes, userRes] = await Promise.all([
          fetch('/api/v1/profile'),
          fetch('/api/v1/user')
        ]);
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData);
          reset(profileData); // Set form values
        }
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserEmail(userData.email);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/v1/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setMessage('Profile updated successfully!');
        reset(data); // Reset form dirty state
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      {/* User Email (Read-only) */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={userEmail}
          disabled
          className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
        />
        <p className="text-sm text-gray-500 mt-1">
          Email cannot be changed at this time
        </p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            {...register('displayName')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your display name"
          />
          {errors.displayName && (
            <p className="text-red-500 text-sm mt-1">{errors.displayName.message}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="url"
            {...register('website')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://yourwebsite.com"
          />
          {errors.website && (
            <p className="text-red-500 text-sm mt-1">{errors.website.message}</p>
          )}
        </div>

        {/* GitHub */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GitHub
          </label>
          <input
            type="url"
            {...register('github')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://github.com/username"
          />
          {errors.github && (
            <p className="text-red-500 text-sm mt-1">{errors.github.message}</p>
          )}
        </div>

        {/* Social Media Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media</h3>
          
          {/* Bluesky */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bluesky
            </label>
            <input
              type="text"
              {...register('bluesky')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="@username.bsky.social"
            />
            {errors.bluesky && (
              <p className="text-red-500 text-sm mt-1">{errors.bluesky.message}</p>
            )}
          </div>

          {/* Mastodon */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mastodon
            </label>
            <input
              type="text"
              {...register('mastodon')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="@username@mastodon.social"
            />
            {errors.mastodon && (
              <p className="text-red-500 text-sm mt-1">{errors.mastodon.message}</p>
            )}
          </div>

          {/* Twitter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Twitter
            </label>
            <input
              type="text"
              {...register('twitter')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="@username"
            />
            {errors.twitter && (
              <p className="text-red-500 text-sm mt-1">{errors.twitter.message}</p>
            )}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
