import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useWeekOverview(weekId) {
  const { user } = useAuth();
  const [weekData, setWeekData] = useState(null);
  const [weekLogs, setWeekLogs] = useState({}); // Map of completed tasks per day
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !weekId) return;
      setLoading(true);

      try {
        // 1. Fetch the Curriculum (The Plan)
        const weekDocRef = doc(db, "weekTemplates", weekId);
        const weekSnap = await getDoc(weekDocRef);
        
        let template = null;
        if (weekSnap.exists()) {
          template = weekSnap.data();
        }

        // 2. Fetch User Logs for this Week (The Progress)
        // We want to know which tasks are done for Day 1, Day 2, etc.
        const logsQuery = query(
          collection(db, "dailyLogs"),
          where("userId", "==", user.uid),
          where("weekId", "==", weekId)
        );
        const logsSnap = await getDocs(logsQuery);

        const logsMap = {};
        logsSnap.forEach((doc) => {
          const data = doc.data();
          // Map: "day1" -> { status: "present", completedItems: [...] }
          logsMap[data.dayIndex] = data; 
        });

        setWeekData(template);
        setWeekLogs(logsMap);

      } catch (error) {
        console.error("Error fetching week overview:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [weekId, user]);

  return { weekData, weekLogs, loading };
}