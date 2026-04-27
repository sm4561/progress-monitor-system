import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../context/AuthContext";

export function useLog(date, selectedWeekId) {
  const { user } = useAuth();
  
  // Data States
  const [weekData, setWeekData] = useState(null); // The curriculum template
  const [existingLog, setExistingLog] = useState(null); // The user's saved data
  const [loading, setLoading] = useState(false);

  // 1. Fetch Curriculum Template (The Static Plan)
  useEffect(() => {
    if (!selectedWeekId) return;

    async function fetchTemplate() {
      try {
        const docRef = doc(db, "weekTemplates", selectedWeekId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWeekData(docSnap.data());
        } else {
          setWeekData(null);
        }
      } catch (error) {
        console.error("Error fetching week:", error);
      }
    }
    fetchTemplate();
  }, [selectedWeekId]);

  // 2. Fetch User's Saved Log for this Date (The "Edit" Feature)
  useEffect(() => {
    if (!user || !date) return;

    async function fetchDailyLog() {
      setLoading(true);
      try {
        const logId = `${user.uid}_${date}`; // Unique ID: user_date
        const docRef = doc(db, "dailyLogs", logId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setExistingLog(docSnap.data()); // Load saved data
        } else {
          setExistingLog(null); // No log for this day yet
        }
      } catch (error) {
        console.error("Error fetching log:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDailyLog();
  }, [date, user]);

  // 3. Save Function
  const saveLog = async (logData) => {
    if (!user) return;
    try {
      const logId = `${user.uid}_${logData.date}`;
      await setDoc(doc(db, "dailyLogs", logId), {
        ...logData,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      });
      
      // Update local state immediately so UI reflects "Saved"
      setExistingLog(logData);
      alert("✅ Daily Progress Updated!");
    } catch (error) {
      console.error("Error saving log:", error);
      alert("❌ Error saving log");
    }
  };

  return { weekData, existingLog, loading, saveLog };
}