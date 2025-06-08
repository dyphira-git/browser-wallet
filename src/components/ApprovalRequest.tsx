import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';

interface PendingRequest {
  id: string;
  type: 'connect' | 'transaction';
  origin?: string;
  site?: string;
  to?: string;
  amount?: string;
  address?: string;
}

export const ApprovalRequest: React.FC = () => {
  const [request, setRequest] = useState<PendingRequest | null>(null);

  useEffect(() => {
    // Load the latest request from storage
    chrome.storage.local.get(['latestRequest'], ({ latestRequest }) => {
      if (latestRequest) {
        setRequest(latestRequest);
      }
    });
  }, []);

  const handleResponse = (approved: boolean) => {
    if (!request) return;

    // Get the current wallet data from Chrome storage
    chrome.storage.local.get(['wallet'], ({ wallet }) => {
      chrome.runtime.sendMessage({
        type: 'APPROVAL_RESPONSE',
        requestId: request.id,
        approved,
        address: wallet?.address || request.address
      });

      // Clear the request after responding
      setRequest(null);
    });
  };

  if (!request) {
    return null;
  }

  return (
    <Box p={4}>
      <VStack spacing={4} align="stretch">
        <Alert status="warning" bg="brand.100">
          <AlertIcon />
          <AlertDescription color="brand.800">
            {request.type === 'connect' ? (
              <>A site wants to connect to your wallet</>
            ) : (
              <>Transaction approval required</>
            )}
          </AlertDescription>
        </Alert>

        <Box bg="brand.50" p={4} borderRadius="md">
          {request.type === 'connect' ? (
            <VStack align="stretch" spacing={2}>
              <Text color="brand.800">
                <strong>{request.origin}</strong> wants to connect to your wallet
              </Text>
              <Text color="brand.700" fontSize="sm">
                Wallet Address: {request.address}
              </Text>
            </VStack>
          ) : (
            <VStack align="stretch" spacing={2}>
              <Text color="brand.800">
                <strong>{request.site}</strong> requests a transaction
              </Text>
              <Text color="brand.700">To: {request.to}</Text>
              <Text color="brand.700">Amount: {request.amount} DYP</Text>
            </VStack>
          )}
        </Box>

        <VStack spacing={3}>
          <Button
            colorScheme="brand"
            width="full"
            onClick={() => handleResponse(true)}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            colorScheme="brand"
            width="full"
            onClick={() => handleResponse(false)}
          >
            Reject
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}; 