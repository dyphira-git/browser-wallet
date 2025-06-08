import { ChakraProvider, Box } from '@chakra-ui/react';
import { WalletProvider } from './context/WalletContext';
import { AuthProvider } from './context/AuthContext';
import { WalletSetup } from './components/WalletSetup';
import { WalletDashboard } from './components/WalletDashboard';
import { ApprovalRequest } from './components/ApprovalRequest';
import { Login } from './components/Login';
import { useWallet } from './context/WalletContext';
import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import theme from './theme';

const WalletContainer = () => {
  const { hasWallet } = useWallet();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Box width="420px" height="600px" overflow="auto" bg="brand.50">
      {hasWallet ? <WalletDashboard /> : <WalletSetup />}
    </Box>
  );
};

function App() {
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    const checkPendingRequest = () => {
      chrome.storage.local.get(['latestRequest'], ({ latestRequest }) => {
        setHasPendingRequest(!!latestRequest);
      });
    };

    // Check initially
    checkPendingRequest();

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.latestRequest) {
        setHasPendingRequest(!!changes.latestRequest.newValue);
      }
    });
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <WalletProvider>
          <Box width="420px" height="600px" overflow="hidden" bg="brand.50">
            {hasPendingRequest ? <ApprovalRequest /> : <WalletContainer />}
          </Box>
        </WalletProvider>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
