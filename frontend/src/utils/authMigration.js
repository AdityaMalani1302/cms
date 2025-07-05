// Migration utility to move authentication tokens from localStorage to sessionStorage
// This ensures users logged in before the security update continue to work seamlessly

export const migrateAuthTokens = () => {
  const tokenKeys = ['adminToken', 'customerToken', 'agentToken', 'deliveryAgentToken'];
  const dataKeys = ['user', 'deliveryAgentInfo'];
  
  let migrated = false;
  
  // Migrate tokens
  tokenKeys.forEach(key => {
    const token = localStorage.getItem(key);
    if (token && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, token);
      localStorage.removeItem(key);
      migrated = true;
    }
  });
  
  // Migrate user data
  dataKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, data);
      localStorage.removeItem(key);
      migrated = true;
    }
  });
  
  if (migrated) {
    console.log('✅ Successfully migrated authentication tokens to sessionStorage for improved security');
  }
  
  return migrated;
};

// Clear any remaining localStorage auth data
export const clearLegacyAuthData = () => {
  const keysToRemove = [
    'adminToken', 
    'customerToken', 
    'agentToken', 
    'deliveryAgentToken',
    'user',
    'deliveryAgentInfo'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
}; 