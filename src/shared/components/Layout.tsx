import type { ReactNode } from 'react';
import { Box, Flex, Heading, Link as ChakraLink } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

import { useAuth } from '@/features/auth/useAuth';

interface LayoutProps {
  children: ReactNode;
}

/**
 * App shell: a small top nav plus the routed page content.
 * Every page — Catalog, This Week, Shopping List, Cooking, Store Setup — links to
 * a real route, one per concern, per `requirements.md`'s navigation constraint.
 */
export function Layout({ children }: LayoutProps) {
  const { signOut } = useAuth();

  return (
    <Box minH="100vh">
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        py={3}
        borderBottomWidth="1px"
      >
        <Heading size="md">Dinner Ideas</Heading>
        <Flex align="center" gap={{ base: 3, md: 4 }}>
          <ChakraLink as={RouterLink} to="/">
            Catalog
          </ChakraLink>
          <ChakraLink as={RouterLink} to="/plan">
            This Week
          </ChakraLink>
          <ChakraLink as={RouterLink} to="/shopping-list">
            Shopping List
          </ChakraLink>
          <ChakraLink as={RouterLink} to="/cooking">
            Cooking
          </ChakraLink>
          <ChakraLink as={RouterLink} to="/store-config">
            Store Setup
          </ChakraLink>
          <ChakraLink as="button" onClick={() => void signOut()}>
            Log out
          </ChakraLink>
        </Flex>
      </Flex>
      <Box as="main" p={{ base: 4, md: 6 }}>
        {children}
      </Box>
    </Box>
  );
}
