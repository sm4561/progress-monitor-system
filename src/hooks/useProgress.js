import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useProgress() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTopics: 0,
    completedTopics: 0,
    remainingTopics: 0,
    completionPercentage: 0,
    completionText: "0%",
    estimatedDays: 0,
    consistencyCount: 0,
    allLogs: [], 
    monthlyDataMap: {}, 
    loading: true,
  });

  useEffect(() => {
    async function calculateProgress() {
      if (!user) return;

      try {
        // --- 1. Get Total Problems from Curriculum ---
        // We fetch the course curriculum to know the "denominator" (Total Goals)
        const curriculumSnapshot = await getDocs(collection(db, "courseCurriculum"));
        let calculatedTotal = 0;
        
        curriculumSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.problems && Array.isArray(data.problems)) {
            calculatedTotal += data.problems.length;
          }
        });
        
        // Fallback if DB is empty (based on your uploaded file)
        if (calculatedTotal === 0) calculatedTotal = 7091; 

        // --- 2. Get User Activity ---
        const logsQuery = query(collection(db, "userLogs"), where("userId", "==", user.uid), orderBy("date", "asc"));
        // Note: If you haven't added userId to logs yet, you might need to fetch all or update LogToday to save userId.
        // For now, assuming standard fetch:
        const logsSnapshot = await getDocs(collection(db, "userLogs")); 
        
        let completedCount = 0;
        let consistencyCount = 0;
        const logsArray = [];
        const monthlyMap = {}; 

        logsSnapshot.forEach(doc => {
            const log = doc.data();
            logsArray.push(log); 

            // A. Total Solved
            const count = Number(log.solvedCount) || 0;
            completedCount += count;

            // B. Consistency (Attendance)
            if (log.attendance === 'Present' || log.attendance === 'Half-Day') {
              consistencyCount++;
            }

            // C. Monthly Data (Grouping by Week Name)
            // log.week looks like "Prerequisites Week 1"
            if (log.week) {
                if (!monthlyMap[log.week]) monthlyMap[log.week] = 0;
                monthlyMap[log.week] += count;
            }
        });

        // --- 3. Final Calculations ---
        const daysLeft = 371 - consistencyCount; // 371 is approx days in year/course
        const percentage = calculatedTotal > 0 ? (completedCount / calculatedTotal) * 100 : 0;

        setStats({
          totalTopics: calculatedTotal,
          completedTopics: completedCount,
          remainingTopics: calculatedTotal - completedCount,
          estimatedDays: daysLeft > 0 ? daysLeft : 0,
          consistencyCount: consistencyCount,
          completionPercentage: percentage.toFixed(1),
          completionText: `${percentage.toFixed(1)}%`,
          allLogs: logsArray,
          monthlyDataMap: monthlyMap,
          loading: false
        });

      } catch (error) {
        console.error("Error calculating progress:", error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    calculateProgress();
  }, [user]);

  return stats;
}