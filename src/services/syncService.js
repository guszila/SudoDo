const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

/**
 * Synchronizes tasks to a Google Apps Script endpoint.
 * This function fires and forgets the network request.
 * @param {Array} tasks - Array of task objects to sync
 * @param {string} email - User's email to associate the sync with
 * @returns {Promise<Object|null>} Status object on success, null on error
 */
export const syncTasksToGAS = async (tasks, email) => {
  if (!GOOGLE_SCRIPT_URL || !email) {
    return { status: 'skipped' };
  }
  
  try {
    const payload = { 
      action: 'SYNC', 
      email: email,
      tasks: tasks 
    };
    
    // Fire and forget
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    }).catch(() => {
      // Ignore background errors to keep console clean per requirements
    });
    
    return { status: 'success' };
  } catch {
    // Only return null without throwing or logging to keep clean
    return null;
  }
};
