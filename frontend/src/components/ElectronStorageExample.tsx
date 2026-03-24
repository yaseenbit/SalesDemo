import { useEffect, useState } from 'react';
import { useElectronStore } from '../hooks/useElectronStore';

/**
 * Example component showing how to use Electron Store in React
 *
 * This demonstrates:
 * 1. Reading from persistent storage when component mounts
 * 2. Writing to persistent storage on user interactions
 * 3. Handling the case when not running in Electron
 */
export const ElectronStorageExample = () => {
  const { getStoreValue, setStoreValue, isElectronApp } = useElectronStore();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from Electron store when component mounts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const data = await getStoreValue('user-data');
        if (data) {
          setUserData(data);
        } else {
          setUserData({ visitCount: 0, lastVisit: null });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isElectronApp) {
      loadUserData();
    } else {
      setIsLoading(false);
    }
  }, [getStoreValue, isElectronApp]);

  const handleSaveUserData = async () => {
    const updatedData = {
      ...userData,
      visitCount: (userData.visitCount || 0) + 1,
      lastVisit: new Date().toISOString(),
    };

    try {
      await setStoreValue('user-data', updatedData);
      setUserData(updatedData);
      alert('User data saved to Electron store!');
    } catch (error) {
      console.error('Failed to save user data:', error);
      alert('Failed to save data');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isElectronApp) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
        <p>Running in browser mode. Electron store is not available.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <h3>Electron Storage Example</h3>
      <div>
        <p>Visit Count: <strong>{userData?.visitCount || 0}</strong></p>
        <p>Last Visit: <strong>{userData?.lastVisit ? new Date(userData.lastVisit).toLocaleString() : 'Never'}</strong></p>
      </div>
      <button onClick={handleSaveUserData}>
        Save User Data
      </button>
    </div>
  );
};

export default ElectronStorageExample;

