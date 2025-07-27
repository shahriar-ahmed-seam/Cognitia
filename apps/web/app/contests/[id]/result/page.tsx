"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Dynamically import a chart library (e.g., react-chartjs-2 or recharts)
const ResponsiveLine = dynamic(() => import("@nivo/line").then(mod => mod.ResponsiveLine), { ssr: false });

export default function ContestResultPage() {
  const router = useRouter();
  const params = useParams();
  const contestId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [contestTitle, setContestTitle] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        // Fetch rankings
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contests/${contestId}/rankings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRankings(data.rankings || []);
        setContestTitle(data.contest?.title || "");
        // Get user id from local storage or context
        const user = JSON.parse(localStorage.getItem("user") || "null");
        setUserId(user?.id || null);
      } catch (err) {
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };
    if (contestId) fetchData();
  }, [contestId]);

  // Prepare data for the plot
  const plotData = [
    {
      id: "Participants",
      data: rankings
        .map((r, i) => ({
          x: Math.round(r.rank),
          y: Math.round(r.score),
          userId: r.userId,
          name: r.name,
          isCurrentUser: r.isCurrentUser,
        }))
        .filter(r => Number.isInteger(r.x) && Number.isInteger(r.y)),
    },
  ];

  // Get unique integer ranks for x-axis ticks
  const rankTicks = Array.from(new Set(plotData[0].data.map(d => d.x))).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gradient-to-t from-white via-blue-100 to-blue-400">
      <Navbar />
      <div className="container mx-auto py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          ← Back
        </Button>
        <h1 className="text-3xl font-bold mb-7 text-black text-center text-outline-black">Results: {contestTitle}</h1>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6 mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <motion.div
                style={{ height: 350 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.7 }}
              >
                <ResponsiveLine
                  data={plotData}
                  margin={{ top: 40, right: 40, bottom: 60, left: 60 }}
                  xScale={{ type: "linear", min: "auto", max: "auto" }}
                  yScale={{ type: "linear", min: "auto", max: "auto" }}
                  axisBottom={{
                    legend: "Rank",
                    legendOffset: 36,
                    legendPosition: "middle",
                    tickValues: rankTicks,
                    format: v => Number.isInteger(v) ? v : ""
                  }}
                  axisLeft={{ legend: "Score", legendOffset: -40, legendPosition: "middle" }}
                  pointSize={12}
                  pointColor={{ theme: "background" }}
                  pointBorderWidth={2}
                  pointBorderColor={{ from: "serieColor" }}
                  enablePointLabel={true}
                  pointLabel={(d) => {
                    const data = d.data as { isCurrentUser?: boolean; name?: string };
                    return data.isCurrentUser ? data.name ?? "" : "";
                  }}
                  useMesh={true}
                  colors={["#f87171"]}
                  theme={{
                    axis: { ticks: { text: { fontSize: 14 } }, legend: { text: { fontSize: 16 } } },
                    labels: { text: { fontWeight: "bold" } },
                  }}
                />
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
            >
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Rankings</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-400">
                        <th className="px-4 py-2">Rank</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Institution</th>
                        <th className="px-4 py-2">Score</th>
                        <th className="px-4 py-2">Correct</th>
                        <th className="px-4 py-2">Time Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((r, i) => (
                        <motion.tr
                          key={r.userId && r.userId !== '' ? `row-${r.userId}-${r.rank}-${i}` : `row-anon-${r.rank}-${i}`}
                          className={r.isCurrentUser ? "bg-blue-50 font-bold" : ""}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.05, duration: 0.4 }}
                        >
                          <td className="px-4 py-2 text-center">{r.rank}</td>
                          <td className="px-4 py-2">{r.isCurrentUser ? r.name : "Anonymous"}</td>
                          <td className="px-4 py-2">{r.institution}</td>
                          <td className="px-4 py-2 text-center">{r.score}</td>
                          <td className="px-4 py-2 text-center">{r.correctAnswers}/{r.totalQuestions}</td>
                          <td className="px-4 py-2 text-center">{r.timeSpent} m</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
} 