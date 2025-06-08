import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Input,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Grid,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  FormControl,
} from '@chakra-ui/react';
import { useWallet } from '../context/WalletContext';
import { validateMnemonic } from '../utils/wallet';

const getExampleWord = (index: number): string => {
  const examples = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent',
    'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'
  ];
  return `${index + 1}. ${examples[index]}`;
};

export const WalletSetup: React.FC = () => {
  const { createWallet, importWallet, mnemonic } = useWallet();
  const [privateKey, setPrivateKey] = useState('');
  const [importMnemonic, setImportMnemonic] = useState<string[]>(Array(12).fill(''));
  const [showMnemonic, setShowMnemonic] = useState(true);
  const toast = useToast();

  const handleCreateWallet = async () => {
    try {
      await createWallet();
      setShowMnemonic(true);
      toast({
        title: 'Wallet Created',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create wallet',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleImportWallet = async () => {
    try {
      await importWallet(privateKey);
      toast({
        title: 'Wallet Imported',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import wallet',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleImportMnemonic = async () => {
    try {
      const words = importMnemonic.filter(word => word.trim() !== '');
      if (words.length !== 12) {
        throw new Error('Please enter all 12 words');
      }
      if (!validateMnemonic(words)) {
        throw new Error('Invalid mnemonic phrase');
      }
      await importWallet(words.join(' '));
      toast({
        title: 'Wallet Imported',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to import wallet',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMnemonicChange = (index: number, value: string) => {
    const newMnemonic = [...importMnemonic];
    newMnemonic[index] = value;
    setImportMnemonic(newMnemonic);
  };

  const MnemonicDisplay = () => (
    <Box mt={6}>
      <Alert status="warning" mb={4} bg="brand.100">
        <AlertIcon />
        <AlertDescription color="brand.800">
          Write down these 12 words and keep them safe. They are the only way to recover your wallet!
        </AlertDescription>
      </Alert>
      <Grid templateColumns="repeat(3, 1fr)" gap={2}>
        {mnemonic.map((word, index) => (
          <Badge
            key={index}
            p={2}
            borderRadius="md"
            textAlign="center"
            bg="brand.50"
            color="brand.800"
            fontSize="md"
            boxShadow="sm"
          >
            {`${index + 1}. ${word}`}
          </Badge>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box p={4} height="100%" bg="brand.50">
      <VStack spacing={6} height="100%" justify="center">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center" color="brand.900">
          Welcome to Dyphira Wallet
        </Text>
        <Tabs isFitted variant="enclosed" width="100%">
          <TabList mb="1em">
            <Tab fontWeight="medium" _selected={{ color: 'brand.900', bg: 'brand.100' }}>Create New</Tab>
            <Tab fontWeight="medium" _selected={{ color: 'brand.900', bg: 'brand.100' }}>Import</Tab>
            <Tab fontWeight="medium" _selected={{ color: 'brand.900', bg: 'brand.100' }}>Recovery</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <VStack spacing={6}>
                <Text textAlign="center" color="brand.700">
                  Create a new wallet to get started with Dyphira
                </Text>
                <Button 
                  colorScheme="brand"
                  size="lg" 
                  width="full"
                  onClick={handleCreateWallet}
                >
                  Create Wallet
                </Button>
                {showMnemonic && mnemonic.length > 0 && <MnemonicDisplay />}
              </VStack>
            </TabPanel>
            <TabPanel>
              <VStack spacing={6}>
                <Text textAlign="center" color="brand.700">
                  Import your existing wallet using private key
                </Text>
                <Input
                  placeholder="Enter private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  size="lg"
                  bg="white"
                />
                <Button
                  colorScheme="brand"
                  onClick={handleImportWallet}
                  isDisabled={!privateKey}
                  width="full"
                  size="lg"
                >
                  Import Wallet
                </Button>
              </VStack>
            </TabPanel>
            <TabPanel>
              <VStack spacing={6}>
                <Text textAlign="center" color="brand.700">
                  Recover your wallet using 12-word recovery phrase
                </Text>
                <Grid 
                  templateColumns="repeat(3, 1fr)" 
                  gap={4} 
                  width="100%"
                  bg="brand.100"
                  p={4}
                  borderRadius="md"
                >
                  {Array.from({ length: 12 }).map((_, index) => (
                    <FormControl key={index}>
                      <Input
                        placeholder={getExampleWord(index)}
                        value={importMnemonic[index]}
                        onChange={(e) => handleMnemonicChange(index, e.target.value)}
                        size="md"
                        bg="white"
                        borderColor="brand.200"
                        _hover={{ borderColor: 'brand.300' }}
                        _focus={{ 
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)'
                        }}
                      />
                    </FormControl>
                  ))}
                </Grid>
                <Button
                  colorScheme="brand"
                  onClick={handleImportMnemonic}
                  isDisabled={importMnemonic.some(word => !word.trim())}
                  width="full"
                  size="lg"
                  mt={4}
                >
                  Recover Wallet
                </Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}; 