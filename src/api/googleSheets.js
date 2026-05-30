const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const fetchTasks = async (uid) => {
  if (!GOOGLE_SCRIPT_URL || !uid) return [];
  try {
    const url = `${GOOGLE_SCRIPT_URL}?uid=${uid}`;
    const response = await fetch(url, { redirect: "follow" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export const saveTask = async (action, task, uid) => {
  if (!GOOGLE_SCRIPT_URL || !uid) {
    console.warn("No GAS URL or UID provided. Mocking save.");
    return { status: 'success' };
  }
  try {
    const payload = { action, task, uid };
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error saving task:", error);
    return null;
  }
};
