const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const syncTasksToGAS = async (tasks, email) => {
  if (!GOOGLE_SCRIPT_URL || !email) {
    console.warn("No GAS URL or Email provided. Skipping sync.");
    return { status: 'skipped' };
  }
  
  try {
    const payload = { 
      action: 'SYNC', 
      email: email,
      tasks: tasks 
    };
    
    // Fire and forget, don't await heavily
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    }).catch(e => console.error("Background sync error:", e));
    
    return { status: 'success' };
  } catch (error) {
    console.error("Error syncing to GAS:", error);
    return null;
  }
};
