import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as motion from "motion/react-client";

export default function PeersLoading() {
  return (
    <div className="container flex flex-col mx-auto px-4 pb-10">
      {/* Validator Quality Leaderboard Section Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {/* Validator Stats Overview Skeleton */}
          <div className="space-y-6">
            {/* Header Stats - 2x2 Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-6 w-20 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Additional Stats Row Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 4) * 0.1 }}
                >
                  <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-8 w-16 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="w-12 h-12 rounded-lg" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Validator Table Skeleton */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {[
                        "Rank",
                        "Validator",
                        "Uploads",
                        "Review Coverage",
                        "Quality Score",
                      ].map((header) => (
                        <th
                          key={header}
                          className="text-left py-3 px-4 font-semibold text-gray-700"
                        >
                          <Skeleton className="h-4 w-20" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b border-gray-100"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            <Skeleton className="w-5 h-5" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Peer Review Leaderboard Section Skeleton */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {/* Peer Stats Overview Skeleton */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-8 w-16 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="w-12 h-12 rounded-lg" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Peer Table Skeleton */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="w-5 h-5" />
                <Skeleton className="h-6 w-48" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Rank", "Peer", "Reviews", "Total Contributions"].map(
                        (header) => (
                          <th
                            key={header}
                            className="text-left py-3 px-4 font-semibold text-gray-700"
                          >
                            <Skeleton className="h-4 w-20" />
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-b border-gray-100"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            <Skeleton className="w-5 h-5" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Skeleton className="h-4 w-32" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
