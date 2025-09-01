"use client";

import { useEffect, useState } from "react";
import { PeerLeaderboardStats } from "./components/PeerLeaderboardStats";
import { ValidatorLeaderboardStats } from "./components/ValidatorLeaderboardStats";
import { ValidatorLeaderboardTable } from "./components/ValidatorLeaderboardTable";
import { PeerLeaderboardTable } from "./components/PeerLeaderboardTable";
import { OrganizationStats } from "./components/OrganizationStats";
import { OrganizationStatsTable } from "./components/OrganizationStatsTable";
import * as motion from "motion/react-client";
import { usePreloader } from "@/hooks/usePreloader";
import LoadingSpinner from "@/components/loading-spinner";

export default function PeersPage() {
  const { getCachedData, isDataAvailable, isPreloading } = usePreloader();
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [validatorStats, setValidatorStats] = useState<any>(null);
  const [organizationStats, setOrganizationStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Try to get cached data first
      const cachedPeers = getCachedData('peers');
      if (cachedPeers) {
        setLeaderboard(cachedPeers.leaderboard);
        setValidatorStats(cachedPeers.validatorStats);
        setOrganizationStats(cachedPeers.organizationStats);
        setIsLoading(false);
        return;
      }

      // If no cached data, fetch fresh data
      if (!isDataAvailable('peers') && !isPreloading) {
        try {
          const [leaderboardRes, validatorStatsRes, organizationStatsRes] = await Promise.all([
            fetch('/api/v1/stats/peer-leaderboard'),
            fetch('/api/v1/stats/validator-leaderboard'),
            fetch('/api/v1/stats/organization-stats'),
          ]);
          
          // Handle each response individually to avoid partial failures
          if (leaderboardRes.ok) {
            const leaderboardData = await leaderboardRes.json();
            setLeaderboard(leaderboardData);
          } else {
            console.error('Failed to fetch peer leaderboard:', leaderboardRes.status);
            setLeaderboard({ peers: [], totalPeers: 0, lastUpdated: new Date() });
          }
          
          if (validatorStatsRes.ok) {
            const validatorStatsData = await validatorStatsRes.json();
            setValidatorStats(validatorStatsData);
          } else {
            console.error('Failed to fetch validator stats:', validatorStatsRes.status);
            setValidatorStats({ validators: [], totalValidators: 0, lastUpdated: new Date() });
          }
          
          if (organizationStatsRes.ok) {
            const organizationStatsData = await organizationStatsRes.json();
            setOrganizationStats(organizationStatsData);
          } else {
            console.error('Failed to fetch organization stats:', organizationStatsRes.status);
            setOrganizationStats({ organizations: [], totalOrganizations: 0, lastUpdated: new Date() });
          }
        } catch (error) {
          console.error('Error loading peers data:', error);
          // Set default empty states on error
          setLeaderboard({ peers: [], totalPeers: 0, lastUpdated: new Date() });
          setValidatorStats({ validators: [], totalValidators: 0, lastUpdated: new Date() });
          setOrganizationStats({ organizations: [], totalOrganizations: 0, lastUpdated: new Date() });
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [getCachedData, isDataAvailable, isPreloading]);

  if (isLoading || isPreloading) {
    return (
      <div className="container flex flex-col mx-auto px-4 pb-10">
        <LoadingSpinner position="block" />
      </div>
    );
  }

  return (
    <div className="container flex flex-col mx-auto px-4 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Validator Quality Leaderboard
            </h2>
            <p className="text-gray-600">
              Validators ranked by peer review metrics
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <ValidatorLeaderboardStats leaderboard={validatorStats} />
          <ValidatorLeaderboardTable
            validators={validatorStats?.validators || []}
          />
        </div>
      </motion.div>

      {/* Peer Review Leaderboard Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Peer Review Leaderboard
            </h2>
            <p className="text-gray-600">
              Top reviewers ranked by their impact
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <PeerLeaderboardStats leaderboard={leaderboard} />
          <PeerLeaderboardTable peers={leaderboard?.peers || []} />
        </div>
      </motion.div>

      {/* Organization Statistics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Organization Statistics
            </h2>
            <p className="text-gray-600">
              Organizations ranked by their contributions and impact
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-12">
          <OrganizationStats stats={organizationStats} />
          <OrganizationStatsTable organizations={organizationStats?.organizations || []} />
        </div>
      </motion.div>
    </div>
  );
}
